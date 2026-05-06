import { processNovaCommand } from "../utils/informationZone.js";

const novaCommandMiddleware = (req, _res, next) => {
  const input =
    req.body?.message_text ?? req.body?.transcript ?? req.body?.command ?? "";

  req.novaCommand = processNovaCommand(input);
  next();
};

export default novaCommandMiddleware;
