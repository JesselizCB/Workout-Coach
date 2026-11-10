# Especificación: evolución de Workout Coach

> **Estado:** en elaboración. Este documento se actualiza si una decisión cambia durante el desarrollo.

## 1. Contexto y problema

### 1.1 Contexto

Workout Coach es una aplicación Angular 20 que guía una sesión de entrenamiento con temporizadores de repetición y descanso. Hoy gestiona un solo ejercicio y concentra casi toda su lógica en un componente.

El objetivo no es reconstruirla, sino evolucionarla sin romper su comportamiento: separar responsabilidades, hacerla testeable e incorporar el entrenamiento completo con una lista de ejercicios.

### 1.2 Estado inicial de la base

El código recibido no compilaba ni ejecutaba tal como se entregó. Antes de cualquier refactor se aplicaron reparaciones mínimas, sin modificar la lógica de la aplicación.

| Problema | Síntoma | Reparación | Commit |
|---|---|---|---|
| Falta `src/index.html` | `ng build` falla | Crear la página base con `<app-root>` | `0307943` |
| `serve` sin configuración por defecto | `ng serve` exige `buildTarget` | Añadir `defaultConfiguration` | `0307943` |
| Falta `zone.js` | Error `NG0908` en ejecución | Instalarlo y declararlo en `polyfills` de `build` | `0307943` |
| Falta `@types/jasmine` | Los tests no compilan | Instalarlo como dependencia de desarrollo | `eb1ed61` |
| `test` sin `polyfills` | Error `NG0908` en los tests | Declarar `zone.js` y `zone.js/testing` | `eb1ed61` |

Tras estas reparaciones, `npm run build`, `npm start` y `npm test` funcionan.

### 1.3 Problemas de diseño

| Problema | Evidencia | Consecuencia |
|---|---|---|
| Lógica de negocio en el componente | `WorkoutTimerComponent.start()` contiene el temporizador y todas las transiciones | No se puede probar la lógica sin Angular ni reutilizarla |
| Tipado débil | `exercise: any`, `timer: any`, `getWorkout(): any` | El compilador no detecta errores de contrato |
| Estado mutable y disperso | Seis campos mutables independientes (`seconds`, `completed`, `running`, `resting`, `toast`, `timer`) | Se pueden alcanzar combinaciones inválidas |
| DTO expuesto a la vista | El template lee `exercise_name` y `repetitions_number` | Un cambio en la API externa impacta en la presentación |
| Acoplamiento a la implementación | El componente depende directamente de `WorkoutService` | No se puede sustituir la fuente de datos |
| Temporizador imperativo sin limpieza | `setInterval` sin `ngOnDestroy` | El intervalo sigue activo si el componente se destruye |
| Presentación y negocio mezclados | Un único componente con plantilla, estado y reglas | Baja cohesión y componentes no reutilizables |
| Sintaxis y patrones antiguos | `*ngIf`, `[ngClass]`, `CommonModule`, inyección por constructor, sin `OnPush` | No aprovecha las capacidades actuales de Angular |
| Cobertura insuficiente | Un único test que solo verifica que se crea `AppComponent` | Ningún test protege el comportamiento durante el refactor |

### 1.4 Defectos funcionales detectados

| Defecto | Causa | Efecto |
|---|---|---|
| El entrenamiento puede continuar tras finalizar | Al terminar, `running` vuelve a `false` y `start()` no comprueba si la sesión acabó | Pulsar Start de nuevo lleva el contador a `4 / 3` |
| Formato de tiempo limitado | El prefijo `00:` es fijo en el template | 90 segundos se mostraría como `00:90` |
| Clase de descanso sin efecto | `[ngClass]` aplica `rest`, pero no existe ese estilo | El descanso no se distingue visualmente |

### 1.5 Limitación funcional

La aplicación solo admite un ejercicio. No existe una lista, ni estados por ejercicio, ni avance automático entre ejercicios, que son el núcleo de la nueva funcionalidad.

## 12. Registro de decisiones

### D1. Retirada progresiva de `zone.js`

**Contexto.** En Angular 20 la detección de cambios usa `zone.js` por defecto, y el modo zoneless es estable desde la versión 20.2 mediante `provideZonelessChangeDetection()`. El componente legacy modifica variables normales dentro de un `setInterval`, lo que no notifica a Angular.

**Evidencia.** Se ejecutó el componente legacy en una copia temporal, pulsando Start y observando la pantalla unos 3,5 segundos después:

| Modo | Temporizador |
|---|---|
| Con `zone.js` | `00:02`, avanza |
| Zoneless | `00:05`, congelado |

**Decisión.** Mantener `zone.js` mientras exista el componente legacy y escribir el código nuevo con Signals, sin depender de él. Al retirar el componente legacy, activar `provideZonelessChangeDetection()` y eliminar `zone.js` de las dependencias y de `polyfills`.

**Justificación.**

- La aplicación funciona en cada commit durante la migración.
- La reactividad queda explícita: la vista se actualiza porque cambia un signal, no por una intercepción global de APIs del navegador.
- Se elimina una dependencia que modifica APIs globales y se reduce el código que se envía al navegador.

**Costos.** Los tests de componentes no podrán usar `fakeAsync`, que depende de `zone.js`. La lógica del temporizador se probará en TypeScript puro, por lo que no lo necesita.

**Validación.** Al completar la retirada se compararán el tamaño del build antes y después, y se registrará el resultado en la sección de evidencia.
