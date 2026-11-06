# PHYLO

**PHYLO (Physics Learning Openware)** is an open-source educational platform that promotes hands-on science education through accessible laboratory experiences, open hardware, educational resources, and interactive web applications.

The project aims to make practical experimentation more accessible by providing reproducible laboratories built with locally available materials and openly shared documentation.

---

# Overview

PHYLO combines software, hardware, documentation, and educational content into a single platform where teachers and students can discover, build, and use practical laboratory experiences.

The platform is designed to grow over time, supporting additional laboratories, educational resources, and interactive applications while maintaining a simple and consistent user experience.

---

# Objectives

* Promote practical science education.
* Provide affordable and reproducible laboratory experiences.
* Share hardware, software, and educational resources openly.
* Encourage collaboration between educators, students, and developers.
* Build a scalable platform capable of supporting future educational projects.

---

# Repository Structure

```text
PHILO/

├── platform/          # Astro web platform
├── apps/              # Laboratory applications
├── firmware/          # Arduino and embedded software
├── hardware/          # CAD models, STL files and hardware resources
├── assets/            # Shared media resources
├── documentation/     # Product and technical documentation
├── thesis/            # Thesis-related documents
├── README.md
└── AGENTS.md
```

---

# Technologies

Current technologies used by the project include:

* Astro
* HTML5
* CSS3
* JavaScript (ES6+)
* Markdown
* Git
* GitHub

For additional technical decisions, see:

`documentation/technical/TechStack.md`

---

# Current Status

PHYLO is currently under active development.

The first release focuses on building the core platform and publishing the initial laboratory resources, including:

* Laboratory documentation
* Teacher manuals
* Student manuals
* Hardware files
* Firmware
* Interactive laboratory applications

---

# Getting Started

The web platform lives in `platform/` and is built with Astro.

Run these commands from the repository root. `npm install` has to run inside `platform/` so the `three` package is installed. If the dev server says `Failed to resolve import "three"`, run `npm install` in `platform/` again.

```sh
cd platform
npm install
npm run dev
```

Open [http://localhost:4321/laboratories/mruv](http://localhost:4321/laboratories/mruv) and scroll to **Simulador MRUV**. Use Reproducir, Pausar, and Reiniciar. The kinematic parameters (`x0`, `v0`, `a`, `railLength`) load from `platform/public/data/mruv.json` and are printed in the browser console.

---

# Documentation

Project documentation is organized into two categories:

## Product Documentation

Defines the vision, objectives, and design philosophy of PHYLO.

```
documentation/product/
```

## Technical Documentation

Defines the technologies, development standards, and technical decisions used throughout the project.

```
documentation/technical/
```

---

# Contributing

Contributions are welcome.

Before implementing significant changes, contributors should review the project documentation and follow the development guidelines defined in `AGENTS.md`.

---

# License

The project license will be defined before the first public release.
