import prisma from "../lib/prisma.js";

const staticController = {
  getFAQ: async (req, res) => {
    try {
      const faqs = await prisma.staticQuestions.findMany({
        orderBy: {
          category: "asc",
        },
      });

      return res.status(200).json({
        status: true,
        message: "FAQs retrieved successfully",
        data: faqs,
      });
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default staticController;
