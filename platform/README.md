# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

Run these commands inside `platform/` (the Astro app), not the git repository root. After pulling, run `npm install` again so `three` is installed. Without that, Vite reports `Failed to resolve import "three"`.

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Simulador MRUV

The laboratory page includes a Three.js viewer of the rail and cart.

With the dev server running, open `/laboratories/mruv`. The scene loads `public/models/riel-y-carrito.glb` and the parameters in `public/data/mruv.json`. Motion along the rail uses `x = x0 + v0*t + 0.5*a*t^2`.

To rebuild the GLB from the original binary STL (millimeters):

```sh
python3 scripts/convert-riel-stl.py ruta/Riel_y_carrito_v2.stl public/models/riel-y-carrito.glb
```

The script needs Python packages `trimesh`, `numpy`, `scipy`, and `fast-simplification`. It welds the STL, keeps the cart as its own mesh, decimates the dense bodies, and writes the model in meters.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
