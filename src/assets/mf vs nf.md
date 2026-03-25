# Webpack Module Federation vs Native Federation

## Core Philosophy

- **Webpack Module Federation**: Bundler-driven federation
- **Native Federation**: Browser-native federation (`ESM` + import maps)

**Winner (future-proofing):** Native Federation

## Dependency on Bundler

- **Webpack MF**: Hard dependency on Webpack
- **Native Federation**: Works with Vite / esbuild / Angular builder

**Winner:** Native Federation

## Architecture

- **Webpack MF**: Custom runtime (`container`, `share scope`, `init`)
- **Native Federation**: Standard browser module resolution

**Winner (clean architecture):** Native Federation

**Winner (control/power):** Webpack MF

## Dependency Sharing

- **Webpack MF**: Advanced, battle-tested sharing (`singleton`, version negotiation)
- **Native Federation**: Simpler, less mature sharing

**Winner:** Webpack Module Federation

## Runtime System

- **Webpack MF**: Rich runtime (`plugins`, manifests, hooks)
- **Native Federation**: Minimal runtime; the browser does most of the work

**Winner (features):** Webpack MF

**Winner (simplicity):** Native Federation

## Build Performance

- **Webpack MF**: Slower builds because of Webpack overhead
- **Native Federation**: Faster builds with esbuild / Vite

**Winner:** Native Federation

## Startup Performance

- **Webpack MF**: Runtime overhead from container init and share negotiation
- **Native Federation**: Leaner startup with direct ESM loading

**Winner:** Native Federation

## Debugging

- **Webpack MF**: Harder because of a black-box runtime
- **Native Federation**: Easier because modules are standard and network-inspectable

**Winner:** Native Federation

## Ecosystem and Maturity

- **Webpack MF**: Huge ecosystem, proven in production
- **Native Federation**: Smaller, newer ecosystem

**Winner:** Webpack Module Federation

## Tooling Support (Nx / Angular)

- **Webpack MF**: First-class Nx support, generators, and docs
- **Native Federation**: Good support, but less integrated

**Winner:** Webpack Module Federation

## Standards Alignment

- **Webpack MF**: Proprietary runtime
- **Native Federation**: Uses browser standards (`ESM`, import maps)

**Winner:** Native Federation

## Migration Flexibility

- **Webpack MF**: Locked into Webpack
- **Native Federation**: Flexible, can switch tooling

**Winner:** Native Federation

## SSR Support

- **Webpack MF**: Mature SSR support
- **Native Federation**: Supported, but newer

**Winner:** Webpack MF (slight edge)

## Learning Curve

- **Webpack MF**: Complex because of Webpack plus federation concepts
- **Native Federation**: Complex because of ESM plus import maps

**Winner:** No clear winner

## Real-World Stability

- **Webpack MF**: Proven at scale
- **Native Federation**: Growing adoption

**Winner:** Webpack Module Federation

## Brutal Summary

- Want stability + ecosystem + enterprise safety: **Webpack Module Federation**
- Want modern architecture + speed + flexibility: **Native Federation**

---

## Native Federation Setup Notes

### 1. Create the workspace and both apps

```bash
ng new nf-workspace --no-create-application
cd nf-workspace

ng generate application shell --standalone
ng generate application remote --standalone
```

This gives you one Angular workspace with two standalone apps. Native Federation supports this host/remote structure with Angular's modern application builder flow.

### 2. Add Native Federation

Run these commands from the workspace root.

For the shell:

```bash
ng add @angular-architects/native-federation --project shell --type dynamic-host --port 4200
```

For the remote:

```bash
ng add @angular-architects/native-federation --project remote --type remote --port 4201
```

These are the standard Angular CLI setup commands: `dynamic-host` for the shell and `remote` for the microfrontend.

### 3. Configure the shell manifest

Open `projects/shell/public/federation.manifest.json` and use:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

The manifest maps the remote name to the remote's `remoteEntry.json`.

### 4. Configure `shell/main.ts`

Open `projects/shell/src/main.ts` and use:

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation('federation.manifest.json')
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
```

For a dynamic host, the shell initializes Native Federation with the manifest during startup.

### 5. Configure `remote/main.ts`

Open `projects/remote/src/main.ts` and use:

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
```

The remote initializes federation without a manifest path; the manifest belongs to the shell.

### 6. Create the remote component

Generate the remote page component:

```bash
ng generate component remote/remote-home-component --project remote --standalone
```

Then open `projects/remote/src/app/remote-home-component/remote-home-component.ts` and use:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-remote-home-component',
  standalone: true,
  template: `
    <h2>Remote App</h2>
    <p>This content is loaded from the remote application.</p>
  `,
})
export class RemoteHomeComponent {}
```

### 7. Configure remote routes

Open `projects/remote/src/app/app.routes.ts` and use:

```ts
import { Routes } from '@angular/router';
import { RemoteHomeComponent } from './remote-home-component/remote-home-component';

export const REMOTE_ROUTES: Routes = [
  {
    path: '',
    component: RemoteHomeComponent,
  },
];
```

This exposes a route entry that the shell can lazy-load.

### 8. Configure remote federation

Open `projects/remote/federation.config.js` and use:

```js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'remote',

  exposes: {
    './routes': './src/app/app.routes.ts',
  },

  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: false,
      requiredVersion: 'auto',
    }),
  },
});
```

The `./routes` entry must point to a real file that exports `REMOTE_ROUTES`. The remote name must match the manifest key and the first argument passed to `loadRemoteModule(...)`.

### 9. Configure shell routes

Open `projects/shell/src/app/app.routes.ts` and use:

```ts
import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  {
    path: 'remote',
    loadChildren: () =>
      loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES),
  },
];
```

This tells the shell to load the exposed remote routes when the user navigates to `/remote`.

### 10. Configure the shell root component with button and outlet

Open `projects/shell/src/app/app.ts` and use:

```ts
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <h1>Shell App</h1>

    <button type="button" (click)="loadRemoteApp()">
      Load Remote App
    </button>

    <router-outlet />
  `,
})
export class App {
  private readonly router = inject(Router);

  loadRemoteApp(): void {
    this.router.navigate(['/remote']);
  }
}
```

The shell acts as the host container, and the remote route renders inside the shell's router outlet.

### 11. Configure `shell/app.config.ts`

Open `projects/shell/src/app/app.config.ts` and use:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
```

### 12. Start both apps

Start the remote first:

```bash
ng serve remote
```

Start the shell second:

```bash
ng serve shell
```

Starting both separately is the normal local development flow for Native Federation host/remote setups.

### 13. Verify the runtime URLs

Open these in the browser:

- Shell manifest: `http://localhost:4200/federation.manifest.json`
- Remote entry: `http://localhost:4201/remoteEntry.json`

The shell manifest should return:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

If those URLs work, the shell can resolve the remote name and the remote is serving federation metadata correctly.

## Final File Summary

### `projects/shell/public/federation.manifest.json`

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

### `projects/shell/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation('federation.manifest.json')
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
```

### `projects/shell/src/app/app.routes.ts`

```ts
import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  {
    path: 'remote',
    loadChildren: () =>
      loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES),
  },
];
```

### `projects/shell/src/app/app.ts`

```ts
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <h1>Shell App</h1>

    <button type="button" (click)="loadRemoteApp()">
      Load Remote App
    </button>

    <router-outlet />
  `,
})
export class App {
  private readonly router = inject(Router);

  loadRemoteApp(): void {
    this.router.navigate(['/remote']);
  }
}
```

### `projects/shell/src/app/app.config.ts`

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
```

### `projects/remote/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
```

### `projects/remote/src/app/app.routes.ts`

```ts
import { Routes } from '@angular/router';
import { RemoteHomeComponent } from './remote-home-component/remote-home-component';

export const REMOTE_ROUTES: Routes = [
  {
    path: '',
    component: RemoteHomeComponent,
  },
];
```

### `projects/remote/src/app/remote-home-component/remote-home-component.ts`

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-remote-home-component',
  standalone: true,
  template: `
    <h2>Remote App</h2>
    <p>This content is loaded from the remote application.</p>
  `,
})
export class RemoteHomeComponent {}
```

### `projects/remote/federation.config.js`

```js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'remote',

  exposes: {
    './routes': './src/app/app.routes.ts',
  },

  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: false,
      requiredVersion: 'auto',
    }),
  },
});
```
