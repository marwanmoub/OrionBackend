import nodemailer from "nodemailer";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendAccDeletionNotice(email) {
    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px;">ORION</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Account Deletion Notice</h2>
        <p>This email confirms that a request to delete your Orion account has been received and processed.</p>
        
        <p>Your account is currently in a <strong>10-day grace period</strong>. On the tenth day from the date of the request, all data associated with this account—including projects, configurations, and personal identifiers—will be permanently purged from the Orion System.</p>
        
        <div style="background-color: #fff4f4; color: #a94442; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px;">
          <strong>Warning:</strong> This action is irreversible once the 10-day window has closed. All data will be destroyed in accordance with our security protocols.
        </div>

        <p>If you wish to retain your account, simply log back into the Orion portal before the 10-day period expires to cancel the pending deletion.</p>
      </div>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p>You are receiving this because a deletion request was triggered from your account settings.</p>
        <p>&copy; 2026 Orion System</p>
      </div>
    </div>
  `;
    try{
      console.log(`Sending account deletion notice to ${email}...`);
        await transporter.sendMail({
            from: `"Orion System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Orion: Account Deletion Notice",
            html: htmlContent,
          });
            return {
                status: true,
            };
    }catch(err){
        console.error("Failed to send email:", err);
        return { status: false, error: err.message };
    }
}
export async function sendAccDeletedFinal(email) {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px;">ORION</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Account Permanently Deleted</h2>
          <p>This is a final confirmation that your Orion account and all associated data have been purged from our systems.</p>
          <p>In accordance with our privacy protocols, your projects, configurations, and personal identifiers have been erased. You will no longer be able to access the Orion portal with your previous credentials.</p>
          <p>Thank you for having been part of the system.</p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          <p>&copy; 2026 Orion System</p>
        </div>
      </div>
    `;
    try {
      await transporter.sendMail({
        from: `"Orion System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Orion: Account Deletion Confirmed",
        html: htmlContent,
      });
      return { status: true };
    } catch (err) {
      console.error("Failed to send email:", err);
      return { status: false, error: err.message };
    }

  }
  export async function sendAccRestoredNotice(email) {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px;">ORION</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Account Restored</h2>
          <p>Welcome back. Your Orion account has been successfully removed from the deletion queue.</p>
          <p>All your data remains intact, and your access has been fully restored. The pending 10-day grace period is now void.</p>
          <p>You can continue your work exactly where you left off.</p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          <p>This restoration was triggered by a recent login or manual override.</p>
          <p>&copy; 2026 Orion System</p>
        </div>
      </div>
    `;
    try {
      await transporter.sendMail({
        from: `"Orion System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Orion: Account Successfully Restored",
        html: htmlContent,
      });
      return { status: true };
    } catch (err) {
      console.error("Failed to send email:", err);
      return { status: false, error: err.message };
    }
  }
