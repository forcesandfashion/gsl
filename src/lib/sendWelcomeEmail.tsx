import emailjs from "emailjs-com";

emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const sendWelcomeEmail = async (
  toEmail: string,
  username: string,
  roleMessage: string
) => {
  try {
    console.log("📧 Sending email to:", toEmail, "for user:", username);

    const response = await emailjs.send(
      "service_u83xwds", // Replace with your EmailJS Service ID
      "template_t9larzg", // Replace with your EmailJS Template ID
      {
        email: toEmail,
        name: username,
        roleMessage: roleMessage, // new param
      },
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    console.log("✅ Email sent:", response.status, response.text);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};
