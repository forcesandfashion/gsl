import emailjs from "emailjs-com";



emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const sendWelcomeEmail = async (toEmail: string, username: string) => {
  try {
    // Add logging to debug the parameters
    console.log("📧 Sending email to:", toEmail, "for user:", username);
    
    const response = await emailjs.send(
      "service_u83xwds", // Replace with your EmailJS Service ID
      "template_q98y5tb", // Replace with your EmailJS Template ID
      {
        email: toEmail, // Changed from to_email to email to match your template
        username: username,
      },
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY // Pass the public key directly as a string
    );
    console.log("✅ Email sent:", response.status, response.text);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};