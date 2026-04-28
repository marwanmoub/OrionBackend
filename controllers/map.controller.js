import prisma from "../lib/prisma.js";

const mapController = {
  getMarkersByQR: async (req, res) => {
    try {
      const { qrCodeId } = req.query;

      if (!qrCodeId) {
        return res.status(400).json({
          status: false,
          message: "qrCodeId query param is required",
        });
      }

      const markers = await prisma.marker.findMany({
        where: { qrCodeId: String(qrCodeId) },
      });

      return res.status(200).json({
        status: true,
        message: "Markers retrieved successfully",
        data: markers,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default mapController;
