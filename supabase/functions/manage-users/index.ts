import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT using getClaims for proper token verification
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Try getClaims first, fall back to getUser
    const token = authHeader.replace("Bearer ", "");
    let callerId: string | null = null;
    
    if (typeof callerClient.auth.getClaims === 'function') {
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        callerId = claimsData.claims.sub as string;
      }
    }
    
    if (!callerId) {
      const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser();
      if (userError || !callerUser) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = callerUser.id;
    }

    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = { id: callerId };

    // Check admin or institution_admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleChecks } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "institution_admin"]);

    const callerRoles = (roleChecks || []).map((r: any) => r.role);
    const isSuperAdmin = callerRoles.includes("admin");
    const isInstitutionAdmin = callerRoles.includes("institution_admin");

    if (!isSuperAdmin && !isInstitutionAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For institution_admin, get their institution_id for scoping
    let callerInstitutionId: string | null = null;
    if (isInstitutionAdmin && !isSuperAdmin) {
      const { data: inst } = await adminClient
        .from("institutions")
        .select("id")
        .eq("owner_id", caller.id)
        .single();
      callerInstitutionId = inst?.id || null;
      if (!callerInstitutionId) {
        return new Response(JSON.stringify({ error: "Institution not found for this admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: create_user
    if (action === "create_user") {
      const { email, full_name, role, password, course_id } = body;
      if (!email || !role) {
        return new Response(JSON.stringify({ error: "email and role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Helper: check if a user is already enrolled in any course of a given institution
      const isUserInInstitution = async (userId: string, institutionId: string): Promise<boolean> => {
        const { data: memberships } = await adminClient
          .from("course_members")
          .select("course_id, courses!inner(institution_id)")
          .eq("user_id", userId);
        return (memberships || []).some((m: any) => m.courses?.institution_id === institutionId);
      };

      // Determine the institution_id from the course_id (if provided) or from callerInstitutionId
      let targetInstitutionId = callerInstitutionId;
      if (course_id && !targetInstitutionId) {
        const { data: courseData } = await adminClient.from("courses").select("institution_id").eq("id", course_id).single();
        targetInstitutionId = courseData?.institution_id || null;
      }

      // Enforce max_students limit (applies during trial and active periods)
      if (role === "student" && targetInstitutionId) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("max_students")
          .eq("institution_id", targetInstitutionId)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (sub && sub.max_students !== null && sub.max_students < 99999) {
          // Count unique students across all courses in this institution
          const { data: instCourses } = await adminClient
            .from("courses")
            .select("id")
            .eq("institution_id", targetInstitutionId);
          const courseIds = (instCourses || []).map((c: any) => c.id);

          if (courseIds.length > 0) {
            const { data: members } = await adminClient
              .from("course_members")
              .select("user_id")
              .in("course_id", courseIds);
            
            // Get unique user_ids that are students
            const uniqueUserIds = [...new Set((members || []).map((m: any) => m.user_id))];
            if (uniqueUserIds.length > 0) {
              const { data: studentRoles } = await adminClient
                .from("user_roles")
                .select("user_id")
                .in("user_id", uniqueUserIds)
                .eq("role", "student");
              const studentCount = (studentRoles || []).length;
              
              if (studentCount >= sub.max_students) {
                return new Response(
                  JSON.stringify({ error: `Limite de ${sub.max_students} alunos atingido no seu plano. Faça upgrade para cadastrar mais alunos.` }),
                  { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }
        }
      }

      // Generate a unique random password per user if none provided
      const generateRandomPassword = (length = 32): string => {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        const values = new Uint8Array(length);
        crypto.getRandomValues(values);
        return Array.from(values, (v) => charset[v % charset.length]).join("");
      };

      const userPassword = password || generateRandomPassword();

      // Check if user already exists
      const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });
      
      if (listError) {
        console.error("listUsers error:", listError);
      }
      
      let existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      console.log("Existing user found:", existingUser ? existingUser.id : "none", "banned_until:", existingUser?.banned_until);

      if (existingUser) {
        // If user was soft-deleted (banned_until = year 2100+), we need to unban them first
        if (existingUser.banned_until) {
          console.log("User was soft-deleted, unbanning...");
          const { error: updateErr } = await adminClient.auth.admin.updateUserById(existingUser.id, {
            ban_duration: "none",
          });
          if (updateErr) {
            console.error("Unban error:", updateErr);
          }
        }

        // Check if user is already in this institution
        if (targetInstitutionId) {
          const alreadyInInstitution = await isUserInInstitution(existingUser.id, targetInstitutionId);
          if (alreadyInInstitution) {
            return new Response(
              JSON.stringify({ error: "Este e-mail já está cadastrado nesta instituição." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Check if user already has ANY role
        const { data: existingRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", existingUser.id);

        console.log("Existing roles:", JSON.stringify(existingRoles));

        if (existingRoles && existingRoles.length > 0) {
          const currentRole = existingRoles[0].role;
          // Allow linking to course regardless of role difference (multi-tenant support)
          // The user keeps their existing role but gets added to the course
          if (full_name) {
            await adminClient.from("profiles").upsert(
              { user_id: existingUser.id, full_name },
              { onConflict: "user_id" }
            );
          }
          const roleLabel = currentRole === "professor" ? "Professor" : currentRole === "student" ? "Aluno" : currentRole === "institution_admin" ? "Admin Institucional" : currentRole;
          return new Response(
            JSON.stringify({ 
              user_id: existingUser.id, 
              email, 
              role: currentRole, 
              existing: true,
              note: currentRole !== role ? `Usuário mantém o papel ${roleLabel}. Vinculado ao curso com sucesso.` : undefined
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // No roles yet, assign the requested one
        const { error: roleInsertErr } = await adminClient.from("user_roles").upsert(
          { user_id: existingUser.id, role },
          { onConflict: "user_id" }
        );
        if (roleInsertErr) {
          console.error("Role insert error:", roleInsertErr);
          return new Response(
            JSON.stringify({ error: "Falha ao atribuir papel ao usuário." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Upsert profile in case it was deleted
        await adminClient.from("profiles").upsert(
          { user_id: existingUser.id, full_name: full_name || email },
          { onConflict: "user_id" }
        );
        
        return new Response(
          JSON.stringify({ user_id: existingUser.id, email, role, existing: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });

      if (createError) {
        console.error("User creation error:", createError);
        return new Response(JSON.stringify({ error: "Falha ao criar usuário. Verifique os dados." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role (upsert to handle trigger-created default role)
      const { error: roleError } = await adminClient.from("user_roles").upsert(
        { user_id: newUser.user.id, role },
        { onConflict: "user_id" }
      );

      if (roleError) {
        console.error("Role assignment error:", roleError);
        return new Response(JSON.stringify({ error: "Falha ao atribuir papel ao usuário." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ user_id: newUser.user.id, email, role }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: update_user
    if (action === "update_user") {
      const { user_id, full_name, role, email } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (full_name) {
        await adminClient.from("profiles").update({ full_name }).eq("user_id", user_id);
        await adminClient.auth.admin.updateUserById(user_id, {
          user_metadata: { full_name },
        });
      }

      if (email) {
        await adminClient.auth.admin.updateUserById(user_id, { email });
      }

      if (role) {
        // Remove old roles and set new one
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("user_roles").insert({ user_id, role });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: delete_user
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent deleting yourself
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Deleting user:", user_id);
      
      // Delete related data in correct order
      const { error: gmErr } = await adminClient.from("group_members").delete().eq("student_id", user_id);
      if (gmErr) console.error("Delete group_members error:", gmErr);
      
      const { error: cmErr } = await adminClient.from("course_members").delete().eq("user_id", user_id);
      if (cmErr) console.error("Delete course_members error:", cmErr);
      
      const { error: roleErr } = await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (roleErr) console.error("Delete user_roles error:", roleErr);
      
      const { error: profErr } = await adminClient.from("profiles").delete().eq("user_id", user_id);
      if (profErr) console.error("Delete profiles error:", profErr);
      
      const { error } = await adminClient.auth.admin.deleteUser(user_id);

      if (error) {
        console.error("Delete auth user error:", error);
        return new Response(JSON.stringify({ error: "Falha ao excluir usuário." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("User deleted successfully:", user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: change_password
    if (action === "change_password") {
      const { new_password } = body;
      if (!new_password || new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.auth.admin.updateUserById(caller.id, {
        password: new_password,
      });

      if (error) {
        console.error("Password change error:", error);
        return new Response(JSON.stringify({ error: "Falha ao alterar senha." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-users error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
