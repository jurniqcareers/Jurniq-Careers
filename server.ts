
import express from "express";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Initialize Cashfree
Cashfree.XClientId = process.env.CASHFREE_APP_ID || "";
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
Cashfree.XEnvironment = process.env.CASHFREE_ENV === "PRODUCTION" 
  ? CFEnvironment.PRODUCTION 
  : CFEnvironment.SANDBOX;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/send-contact-email", async (req, res) => {
    try {
      const { firstName, lastName, email, message } = req.body;

      const transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
          user: "web@jurniqcareers.com",
          pass: "Suraj@2025#",
        },
      });

      const mailOptions = {
        from: '"Jurniq Careers Web" <web@jurniqcareers.com>',
        to: "contact.us@jurniqcareers.com",
        subject: `New Contact Form Submission from ${firstName} ${lastName}`,
        text: `You have received a new message from the contact form.\n\nName: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3BB0FF; border-bottom: 2px solid #3BB0FF; padding-bottom: 10px;">New Contact Form Submission</h2>
            <p style="font-size: 16px; color: #333;">You have received a new message from the website contact form.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3BB0FF;">${email}</a></p>
            </div>
            
            <h3 style="color: #555; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #3BB0FF; border-radius: 4px; color: #444; line-height: 1.6; white-space: pre-wrap;">
              ${message}
            </div>
            
            <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
              This email was sent automatically from the Jurniq Careers website contact form.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email Error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/send-consultation-email", async (req, res) => {
    try {
      const { name, email, recommendationTitle, recommendationDescription, skills, interviewQuestions } = req.body;

      const transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
          user: "web@jurniqcareers.com",
          pass: "Suraj@2025#",
        },
      });

      const mailOptions = {
        from: '"Jurniq Careers Web" <web@jurniqcareers.com>',
        to: "contact.us@jurniqcareers.com",
        subject: `New Free Consultation Request from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3BB0FF; border-bottom: 2px solid #3BB0FF; padding-bottom: 10px;">New Consultation Request</h2>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3BB0FF;">${email}</a></p>
            </div>
            
            <h3 style="color: #555; margin-bottom: 10px;">Recommendation Details:</h3>
            <div style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #3BB0FF; border-radius: 4px; color: #444; line-height: 1.6;">
              <p><strong>Title:</strong> ${recommendationTitle}</p>
              <p><strong>Description:</strong> ${recommendationDescription}</p>
            </div>

            <h3 style="color: #555; margin-bottom: 10px; margin-top: 20px;">Key Skills:</h3>
            <div style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #3BB0FF; border-radius: 4px; color: #444; line-height: 1.6;">
              ${skills ? skills.map((skill: any) => `<p><strong>${skill.name}:</strong> ${skill.explanation}</p>`).join('') : '<p>Not provided</p>'}
            </div>

            <h3 style="color: #555; margin-bottom: 10px; margin-top: 20px;">Interview Prep Questions:</h3>
            <div style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #3BB0FF; border-radius: 4px; color: #444; line-height: 1.6;">
              ${interviewQuestions ? interviewQuestions.map((q: any) => `<p><strong>Q: ${q.question}</strong><br/>A: ${q.answer_explanation}</p>`).join('') : '<p>Not provided</p>'}
            </div>
            
            <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
              This email was sent automatically from the Jurniq Careers website consultation form.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Consultation Email Error:", error);
      res.status(500).json({ error: "Failed to send consultation email" });
    }
  });

  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount, customerId, customerPhone, customerEmail, planName } = req.body;

      const request = {
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
          customer_email: customerEmail,
        },
        order_meta: {
          return_url: `${process.env.APP_URL || 'http://localhost:3000'}/subscription?order_id={order_id}`,
        },
        order_note: `Subscription for ${planName} plan`,
      };

      const response = await Cashfree.PGCreateOrder("2023-08-01", request);
      res.json(response.data);
    } catch (error: any) {
      console.error("Cashfree Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || "Failed to create order" });
    }
  });

  app.post("/api/create-session-order", async (req, res) => {
    try {
      const { sessionId, sessionTitle, amount, returnUrl, customer } = req.body;

      // Generate a unique customer ID for non-logged-in users
      const customerId = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const request = {
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
        },
        order_meta: {
          return_url: `${returnUrl}?session_id=${sessionId}&order_id={order_id}`,
        },
        order_note: `Registration for ${sessionTitle}`,
        order_tags: {
          session_id: sessionId,
          grade: customer.grade
        }
      };

      const response = await Cashfree.PGCreateOrder("2023-08-01", request);
      res.json(response.data);
    } catch (error: any) {
      console.error("Cashfree Session Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || "Failed to create session order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get(/.*/, (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
