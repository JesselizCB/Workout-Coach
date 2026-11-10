# Workout Coach

Aplicación en Angular 20 que guía un entrenamiento completo. Muestra la lista de ejercicios con su estado (Pendiente, En curso o Completado), cuenta el tiempo de cada repetición y de cada descanso, y avanza sola de un ejercicio al siguiente hasta terminar.

El proyecto parte de una base legacy funcional, que se evolucionó sin romper su comportamiento: Clean Architecture, componentes container y presentacionales, Signals, modo zoneless y tests de cada capa.

## Requisitos

- Node.js 20.19+, 22.12+ o 24+
- npm 10+
- Google Chrome, para ejecutar los tests con Karma

No hace falta instalar Angular CLI de forma global, porque los scripts usan la versión del proyecto.

## Ejecución

```bash
npm ci
npm start
```

Luego abre `http://localhost:4200`.

## Build y tests

```bash
npm run build
npm test
npx ng test --watch=false --code-coverage   # tests con informe de cobertura en coverage/
```

## Arquitectura

La feature vive en `src/app/features/workout/`, repartida en cuatro capas cuyas dependencias apuntan siempre hacia el dominio:

| Capa | Contenido |
|---|---|
| `domain/` | Modelo y reglas del entrenamiento en TypeScript puro, sin Angular. La sesión es una máquina de estados inmutable. Define los puertos `WorkoutRepository` y `Ticker` |
| `application/` | `LoadWorkoutUseCase` y `WorkoutSessionStore`, que guarda el estado en Signals y conecta el dominio con el reloj |
| `infrastructure/` | DTO en `snake_case`, su mapper, el repositorio mock y el `IntervalTicker` |
| `presentation/` | El container `WorkoutPageComponent` y cuatro componentes presentacionales con `input()`, `output()` y `OnPush` |

`workout.providers.ts` es la raíz de composición: el único archivo que asocia cada puerto con su implementación.

## Documentación

- [`docs/spec/workout-refactor.md`](docs/spec/workout-refactor.md): la especificación completa. Incluye el problema, el diseño, los criterios de aceptación, la evidencia de build y tests, la evolución hacia microfrontends y NgRx, y el registro de decisiones.
- [`docs/CHALLENGE.md`](docs/CHALLENGE.md): el enunciado original del reto.

## Historial

El historial cuenta el proceso en orden: primero el código original, después la reparación mínima para que compilara y arrancara, luego la spec y, por último, la implementación bloque por bloque, con los tests escritos antes que el código.

El tag `legacy-baseline` marca la base reparada antes del refactor. Para comparar el antes y el después:

```bash
git diff legacy-baseline main -- src
```
