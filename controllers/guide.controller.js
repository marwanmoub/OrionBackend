/**
 * controllers/guide.controller.js
 */

import { generateGuide } from "../services/guide.service.js";

const guideController = {
  generate: async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await generateGuide(userId, req.body);

      return res.status(200).json({
        status: true,
        message: "Guide generated successfully",
        data,
      });
    } catch (err) {
      const status = err.status ?? 500;

      if (status < 500) {
        return res.status(status).json({ status: false, message: err.message });
      }

      console.error("guide.generate error:", err);
      return res.status(500).json({ status: false, message: "Internal server error" });
    }
  },
};

export default guideController;
