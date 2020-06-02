import Home from "./page.tsx";
import {
  Application,
  Router,
  RouterContext,
} from "https://deno.land/x/oak/mod.ts";
import { App, GuessSafeEnum, generate, log } from "./misc.ts";

// App global state
const State = {
  isRedirect: false,
  win: false,
  hint: "",
  from: "",
  guess: GuessSafeEnum.NAN,
  redirect(ctx: RouterContext, to = App.DEFAULT_ROUTE) {
    this.from = ctx.request.url.toString();
    this.isRedirect = true;
    ctx.response.headers.set("Location", to);
    ctx.response.status = 302;
  },
  endRedirect() {
    this.from = "";
    this.isRedirect = false;
  },
};

// random generation tool
let rand = {
  generate,
  value: generate(),
  reset() {
    return (this.value = this.generate());
  },
};

// App itself
log("Launch server");

// Configuration router
const router = new Router();
router
  .get(App.DEFAULT_ROUTE, (ctx) => {
    ctx.response.type = ".html";
    ctx.response.body = Home(State);
    State.endRedirect();

    log(`Number to guess is ${rand.value}`);
  })
  .get("/guess", (ctx) => {
    const guess =
      (State.guess = parseInt(ctx.request.url.searchParams.get("val") ?? ""));
    log(`${guess} was suggested`);

    switch (true) {
      case guess > rand.value:
        State.hint = "less";
        break;
      case guess < rand.value:
        State.hint = "more";
        break;
      case guess === rand.value:
        State.hint = "";
        State.win = true;
        break;
      default:
        State.hint = "";
        State.guess = GuessSafeEnum.NAN;
    }

    State.redirect(ctx);
  })
  .get("/reset", (ctx) => {
    if (State.win) {
      rand.reset();
      State.win = false;
      State.guess = GuessSafeEnum.NAN;
    } else State.guess = GuessSafeEnum.RESET;

    State.redirect(ctx);
  });

// Configuration middlewares
const app = new Application();
app
  .use(router.routes())
  .use(router.allowedMethods())
  .use((ctx) => {
    ctx.response.status = 404;
    ctx.response.body = "Not found. ¯\\_(ツ)_/¯";
  });

log(`Listen http://${App.HOST}:${App.PORT}`);
// top-level await
await app.listen(`${App.HOST}:${App.PORT}`);

// usage
// deno run -A 02-guessanumber/mod.ts
