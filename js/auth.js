/* =====================================================
   SomaZon Version 0.01
   Login & Registration Authentication
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const authForm = document.getElementById("authForm");
    const authAlert = document.getElementById("authAlert");
    const submitButton = document.getElementById("authSubmit");

    const isRegisterPage =
        document.body.dataset.authPage === "register";

    // Display messages
    function authMessage(message, type = "info") {
        if (!authAlert) {
            console.error("SomaZon: authAlert element not found.");
            return;
        }

        authAlert.textContent = message;
        authAlert.className =
            "auth-alert" +
            (type === "error" ? " error" :
             type === "success" ? " success" : "");

        authAlert.classList.remove("hidden");
    }

    // Get Supabase client
    function getSupabase() {
        const client = window.somazonSupabase;

        if (!client) {
            authMessage(
                "Supabase is not ready. Check js/supabase.js and its configuration.",
                "error"
            );
            return null;
        }

        return client;
    }

    // Password visibility
    window.togglePassword = function () {
        const field = document.getElementById("authPassword");

        if (field) {
            field.type =
                field.type === "password" ? "text" : "password";
        }
    };

    // Resend confirmation email
    window.resendVerification = async function () {
        const email = document.getElementById("authEmail")
            ?.value.trim().toLowerCase();

        if (!email) {
            authMessage("Enter your email address first.", "error");
            return;
        }

        const client = getSupabase();
        if (!client) return;

        try {
            const { error } = await client.auth.resend({
                type: "signup",
                email,
                options: {
                    emailRedirectTo:
                        new URL("index.html", location.href).href
                }
            });

            if (error) throw error;

            authMessage(
                "Confirmation email sent. Check your inbox.",
                "success"
            );

        } catch (error) {
            authMessage(error.message, "error");
        }
    };

    // Check form
    if (!authForm || !submitButton) {
        console.error("SomaZon: Authentication form elements not found.");
        return;
    }

    // Login and Registration
    authForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const client = getSupabase();
        if (!client) return;

        const email = document.getElementById("authEmail")
            .value.trim().toLowerCase();

        const password =
            document.getElementById("authPassword").value;

        const name =
            document.getElementById("authName")?.value.trim()
            || "SomaZon User";

        submitButton.disabled = true;

        submitButton.textContent = isRegisterPage
            ? "Creating account..."
            : "Signing in...";

        try {

            if (isRegisterPage) {

                // CREATE NEW ACCOUNT
                const { data, error } =
                    await client.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: name
                            },
                            emailRedirectTo:
                                new URL("index.html", location.href).href
                        }
                    });

                if (error) throw error;

                if (data.session) {

                    // Save profile if available
                    const { error: profileError } =
                        await client.from("profiles").upsert({
                            id: data.user.id,
                            full_name: name
                        });

                    if (profileError) {
                        console.warn(
                            "Profile save warning:",
                            profileError.message
                        );
                    }

                    location.href = "index.html";

                } else {

                    authMessage(
                        "Account created. Check your email if confirmation is required.",
                        "success"
                    );
                }

            } else {

                // LOGIN
                const { data, error } =
                    await client.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) throw error;

                if (data.session) {
                    location.href = "index.html";
                }
            }

        } catch (error) {

            console.error("SomaZon Authentication Error:", error);

            authMessage(
                error.message || "Authentication failed. Please try again.",
                "error"
            );

        } finally {

            submitButton.disabled = false;

            submitButton.textContent = isRegisterPage
                ? "Create account"
                : "Sign in";
        }
    });

    console.log("SomaZon Authentication initialized successfully.");

});
