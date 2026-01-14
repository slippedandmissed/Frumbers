import Elysia from "elysia";
import game from "./game";
import player from "./player";
import { motd } from "./motd";

export default new Elysia({ prefix: "/api" }).use(game).use(player).use(motd);
