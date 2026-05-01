import prisma from "../lib/prisma.js";

const DEFAULT_RADIUS_METERS = 250;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return number;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatARModel(model, distanceMeters = null) {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    description: model.description,
    category: model.category,
    asset: {
      url: model.asset_url,
      format: model.asset_format,
    },
    anchor: {
      latitude: model.latitude,
      longitude: model.longitude,
      altitudeMeters: model.altitude_meters,
    },
    transform: {
      position: {
        x: model.position_x,
        y: model.position_y,
        z: model.position_z,
      },
      rotation: {
        x: model.rotation_x,
        y: model.rotation_y,
        z: model.rotation_z,
      },
      scale: model.scale,
    },
    isActive: model.is_active,
    ...(distanceMeters !== null && {
      distanceMeters: Math.round(distanceMeters * 100) / 100,
    }),
  };
}

const mapController = {
  getARModels: async (req, res) => {
    try {
      const latitude = parseNumber(req.query.latitude, "latitude");
      const longitude = parseNumber(req.query.longitude, "longitude");
      const radiusMeters =
        parseNumber(req.query.radiusMeters, "radiusMeters") ??
        DEFAULT_RADIUS_METERS;
      const requestedLimit = parseNumber(req.query.limit, "limit");
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, Math.floor(requestedLimit ?? DEFAULT_LIMIT)),
      );

      if ((latitude === null) !== (longitude === null)) {
        return res.status(400).json({
          status: false,
          message: "latitude and longitude must be provided together",
        });
      }

      if (latitude !== null && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({
          status: false,
          message: "latitude must be between -90 and 90",
        });
      }

      if (longitude !== null && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({
          status: false,
          message: "longitude must be between -180 and 180",
        });
      }

      if (radiusMeters <= 0) {
        return res.status(400).json({
          status: false,
          message: "radiusMeters must be greater than 0",
        });
      }

      const arModels = await prisma.arModel.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
      });

      const data = arModels
        .map((model) => {
          const distanceMeters =
            latitude !== null
              ? calculateDistanceMeters(
                  latitude,
                  longitude,
                  model.latitude,
                  model.longitude,
                )
              : null;

          return { model, distanceMeters };
        })
        .filter(
          ({ distanceMeters }) =>
            distanceMeters === null || distanceMeters <= radiusMeters,
        )
        .sort((a, b) => {
          if (a.distanceMeters === null || b.distanceMeters === null) return 0;
          return a.distanceMeters - b.distanceMeters;
        })
        .slice(0, limit)
        .map(({ model, distanceMeters }) =>
          formatARModel(model, distanceMeters),
        );

      return res.status(200).json({
        status: true,
        message: "AR models retrieved successfully",
        data,
      });
    } catch (error) {
      if (error.message?.includes("must be a valid number")) {
        return res.status(400).json({
          status: false,
          message: error.message,
        });
      }

      console.error("getARModels error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default mapController;
