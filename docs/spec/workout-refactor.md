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

## 2. Alcance y fuera de alcance

### 2.1 Dentro del alcance

**Arquitectura**

- Reorganizar la feature en las capas `domain`, `application`, `infrastructure` y `presentation`.
- Invertir la dependencia de datos mediante el puerto `WorkoutRepository`.
- Mapear el DTO externo en `snake_case` al modelo de dominio dentro de `infrastructure`.
- Separar un componente container de componentes presentacionales sin dependencias inyectadas.

**Funcionalidad**

- Entrenamiento completo: el mock devuelve una lista de ejercicios y la sesión avanza automáticamente entre ellos.
- Estado visible por ejercicio: Pendiente, En curso o Completado.
- Conservar el temporizador de repetición y descanso, la notificación, el contador y los controles Iniciar, Pausar y Reiniciar.
- Interfaz en español, con los términos que usan los criterios de aceptación (decisión D2).

**Corrección de defectos (sección 1.4)**

- Impedir que la sesión continúe una vez finalizada.
- Formatear el tiempo como `mm:ss` fuera del template.
- Distinguir visualmente la fase de descanso.

**Angular moderno**

- Standalone components, Signals y `computed()`, `inject()`, `input()` y `output()`, `@if` y `@for`, `OnPush`, TypeScript estricto sin `any`.
- Limpieza correcta del temporizador.
- Retirada de `zone.js` (decisión D1).

**Calidad**

- Tests unitarios de dominio y casos de uso, y al menos un test de componente presentacional.
- Escenarios de borde y error, como una lista vacía o datos inválidos.

**Diseño sin implementación**

- Evolución hacia microfrontends y uso de NgRx, descritos en la sección 11.

### 2.2 Fuera del alcance

| Elemento | Motivo |
|---|---|
| Implementar Module o Native Federation | El reto solo pide su diseño |
| Implementar NgRx u otra librería de estado | El reto solo pide su diseño, y Signals cubre el estado de esta feature |
| Integración con una API real | El reto trabaja con un mock; el puerto `WorkoutRepository` permite añadirla sin cambiar el dominio |
| Persistencia del progreso | No forma parte de los criterios de aceptación |
| Enrutamiento | La feature tiene una sola pantalla |
| Internacionalización | No forma parte de los criterios de aceptación y la interfaz tiene un solo idioma (decisión D2) |
| Rediseño visual | Se conservan los estilos actuales, salvo lo necesario para los estados y el descanso |

## 3. Modelo de dominio

El dominio es TypeScript puro: no importa Angular ni conoce temporizadores reales. Modela la sesión como una **máquina de estados inmutable**: cada operación recibe una sesión y devuelve una nueva.

### 3.1 Tipos

```ts
interface Exercise {
  readonly name: string;
  readonly repetitions: number;
  readonly repetitionSeconds: number;
  readonly restSeconds: number;
}

type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';
type Phase = 'repetition' | 'rest';
type ExerciseStatus = 'pending' | 'in-progress' | 'completed';
type SessionEvent =
  | 'rest-started'
  | 'repetition-started'
  | 'exercise-completed'
  | 'workout-completed';

interface WorkoutSession {
  readonly exercises: readonly Exercise[];
  readonly status: SessionStatus;
  readonly currentIndex: number;
  readonly phase: Phase;
  readonly remainingSeconds: number;
  readonly completedRepetitions: number;
  readonly lastEvent: SessionEvent | null;
}
```

`lastEvent` registra la última transición relevante. La capa `presentation` la convierte en el texto de la notificación (decisión D2).

### 3.2 Invariantes

Una sesión solo se crea con datos válidos. En caso contrario se lanza un error de dominio.

- La lista contiene al menos un ejercicio.
- `repetitions`, `repetitionSeconds` y `restSeconds` son enteros mayores o iguales a 1.

### 3.3 Operaciones

| Operación | Desde | Resultado |
|---|---|---|
| `createSession(exercises)` | — | `idle`, primer ejercicio, fase `repetition`, `remainingSeconds` igual a su `repetitionSeconds` |
| `start` | `idle`, `paused` | `running`, conservando el progreso |
| `pause` | `running` | `paused`, conservando el progreso |
| `reset` | Cualquiera | El mismo estado que `createSession` |
| `tick` | `running` | Avanza un segundo, según la sección 3.4 |

Cualquier operación fuera de los estados indicados devuelve la sesión sin cambios. Así, `start` sobre una sesión `finished` no tiene efecto, lo que corrige el defecto `4 / 3` de la sección 1.4.

### 3.4 Transiciones de `tick`

| Fase | `remainingSeconds` | Condición | Resultado | `lastEvent` |
|---|---|---|---|---|
| Cualquiera | Mayor que 1 | — | Resta un segundo | Sin cambios |
| `repetition` | 1 | — | Pasa a `rest` con `restSeconds` | `rest-started` |
| `rest` | 1 | Quedan repeticiones | Suma una repetición y vuelve a `repetition` con `repetitionSeconds` | `repetition-started` |
| `rest` | 1 | Última repetición, quedan ejercicios | Avanza `currentIndex`, reinicia `completedRepetitions` y pasa a `repetition` con el tiempo del siguiente ejercicio | `exercise-completed` |
| `rest` | 1 | Última repetición del último ejercicio | Suma la repetición, `status` pasa a `finished` y `remainingSeconds` a 0 | `workout-completed` |

Cada repetición, incluida la última de un ejercicio, termina con su descanso, ya que el criterio de aceptación incrementa la repetición completada al terminar el descanso.

### 3.5 Estado de cada ejercicio

El estado de un ejercicio **se deriva** de la sesión y no se almacena, de modo que no puede contradecirla.

| Condición | `ExerciseStatus` |
|---|---|
| Sesión `idle` | `pending` para todos |
| Sesión `finished` | `completed` para todos |
| Índice menor que `currentIndex` | `completed` |
| Índice igual a `currentIndex` | `in-progress` |
| Índice mayor que `currentIndex` | `pending` |

## 4. Capas y contratos

### 4.1 Estructura

```text
src/app/features/workout/
├─ domain/
│  ├─ exercise.ts
│  ├─ workout-session.ts
│  ├─ workout.errors.ts
│  └─ ports/
│     ├─ workout.repository.ts
│     └─ ticker.ts
├─ application/
│  ├─ load-workout.use-case.ts
│  └─ workout-session.store.ts
├─ infrastructure/
│  ├─ exercise.dto.ts
│  ├─ exercise.mapper.ts
│  ├─ mock-workout.repository.ts
│  └─ interval-ticker.ts
├─ presentation/
│  ├─ workout-page/
│  ├─ workout-timer/
│  ├─ exercise-list/
│  ├─ exercise-item/
│  ├─ workout-toast/
│  └─ workout.labels.ts
└─ workout.providers.ts
```

Las carpetas legacy `components/` y `services/` se eliminan al completar la migración.

### 4.2 Reglas de dependencia

| Capa | Puede importar | No puede importar |
|---|---|---|
| `domain` | Nada externo | Angular, RxJS, otras capas |
| `application` | `domain`, Angular | `infrastructure`, `presentation` |
| `infrastructure` | `domain` | `application`, `presentation` |
| `presentation` | `application`, `domain`, Angular | `infrastructure` |

`workout.providers.ts` es la **raíz de composición**: el único archivo que conoce las implementaciones concretas y las asocia a sus puertos. Queda fuera de las cuatro capas y se registra en la configuración de la aplicación.

### 4.3 Puertos

```ts
abstract class WorkoutRepository {
  abstract getExercises(): Promise<readonly Exercise[]>;
}

abstract class Ticker {
  abstract start(onTick: () => void): void;
  abstract stop(): void;
}
```

- Son clases abstractas porque, a diferencia de una interface, existen en ejecución y sirven como token de inyección sin que el dominio importe Angular.
- `getExercises` devuelve una `Promise`, de modo que sustituir el mock por una API real no cambia el contrato.
- `Ticker` aísla el reloj real. Los tests usan un `Ticker` falso y avanzan el tiempo manualmente, sin depender de `fakeAsync` (decisión D1).

### 4.4 Infraestructura

El DTO conserva el formato externo y se traduce al modelo de dominio únicamente en esta capa.

```ts
interface ExerciseDto {
  readonly exercise_name: string;
  readonly repetitions_number: number;
  readonly repetition_time: number;
  readonly rest_time: number;
}
```

| `ExerciseDto` | `Exercise` |
|---|---|
| `exercise_name` | `name` |
| `repetitions_number` | `repetitions` |
| `repetition_time` | `repetitionSeconds` |
| `rest_time` | `restSeconds` |

### 4.5 Aplicación

`LoadWorkoutUseCase` obtiene los ejercicios del repositorio y crea la sesión inicial. Los errores de carga o de datos inválidos llegan a quien lo invoca.

`WorkoutSessionStore` mantiene el estado en Signals y coordina el dominio con el `Ticker`. Se provee a nivel del container, por lo que su ciclo de vida coincide con el de la pantalla y detiene el `Ticker` al destruirse.

```ts
type LoadStatus = 'loading' | 'ready' | 'error';

class WorkoutSessionStore {
  readonly loadStatus: Signal<LoadStatus>;
  readonly session: Signal<WorkoutSession | null>;
  readonly exerciseStatuses: Signal<readonly ExerciseStatus[]>;

  load(): Promise<void>;
  start(): void;
  pause(): void;
  reset(): void;
}
```

Iniciar, pausar y reiniciar no se separan en clases propias: cada una sería una sola línea que delega en el dominio, y añadirían indirección sin aportar comportamiento.

## 5. Flujo de datos

La idea general es sencilla: los datos bajan y los eventos suben. Los componentes presentacionales reciben lo que muestran por `input()` y avisan de lo que pasa por `output()`. El único que habla con el store es el container.

```text
          click                 output()
Usuario ────────> Presentacional ───────> Container ───> Store ───> Dominio
                                                           │
   Vista <──────── Presentacional <─────── Container <─────┘
                       input()             signals
```

### 5.1 Al abrir la pantalla

1. `WorkoutPageComponent` llama a `store.load()`, y mientras tanto `loadStatus` vale `loading`.
2. `LoadWorkoutUseCase` le pide los ejercicios a `WorkoutRepository`.
3. El mock devuelve la lista en `snake_case` y el mapper la convierte a `Exercise`. A partir de aquí nadie vuelve a ver el DTO.
4. `createSession` valida los datos y crea la sesión en `idle`.
5. El store guarda la sesión y pasa a `ready`. La lista aparece con todo en Pendiente y nada empieza hasta que el usuario pulse Iniciar.

Si la carga falla o los datos no son válidos, el store pasa a `error` y la pantalla muestra un mensaje en lugar de la sesión.

### 5.2 Cuando pasa un segundo

Este es el recorrido que más se repite, así que conviene que sea corto:

1. `IntervalTicker` dispara el callback que le pasó el store.
2. El store aplica `tick` y guarda la sesión nueva en su signal.
3. Los `computed()` que dependen de ella se recalculan solos.
4. El container entrega los valores nuevos por `input()` y Angular actualiza solo lo que cambió.

Si después de un `tick` la sesión ya no está en `running`, el store detiene el `Ticker`. Nadie tiene que acordarse de pararlo al terminar el entrenamiento.

### 5.3 Cuando el usuario pulsa un control

`WorkoutTimerComponent` emite un `output()` y el container llama al método del store que corresponda.

- **Iniciar:** aplica `start` y arranca el `Ticker`, pero solo si la sesión estaba en `idle` o `paused`. Así un doble clic no deja dos intervalos corriendo.
- **Pausar:** aplica `pause` y detiene el `Ticker`. La sesión conserva el tiempo y las repeticiones.
- **Reiniciar:** detiene el `Ticker` y aplica `reset`.

### 5.4 Notificaciones

El dominio solo deja constancia de lo que ocurrió en `lastEvent`. El container busca el texto en `workout.labels.ts` y se lo pasa a `WorkoutToastComponent`, que únicamente lo muestra. Como en la versión legacy, el mensaje se queda en pantalla hasta que lo reemplaza otro.

### 5.5 Al salir de la pantalla

El store se provee en el container, de modo que se destruye junto con él. En ese momento detiene el `Ticker` usando `DestroyRef`, y el intervalo no sigue vivo como pasaba antes.

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

### D2. Textos de interfaz centralizados, sin i18n

**Contexto.** La aplicación legacy muestra sus textos en inglés, mientras que el reto nombra los estados y controles en español: Pendiente, En curso, Completado, Iniciar, Pausar y Reiniciar. El reto no pide soporte para varios idiomas.

**Decisión.** Mostrar la interfaz en español y centralizar sus textos en un archivo de la capa `presentation`. El dominio expresa los conceptos con valores técnicos sin idioma, como `'pending'`, `'in-progress'` y `'completed'`, y la presentación los convierte en etiquetas.

**Alternativas descartadas.**

| Alternativa | Motivo |
|---|---|
| `@angular/localize` | Añade configuración y un build por idioma para una aplicación con un solo idioma |
| Transloco u otra librería de traducción | Añade una dependencia sin un requisito que la justifique |
| Textos directos en cada template | Repite los textos y los dispersa entre componentes |

**Justificación.**

- Los tests del dominio no dependen de los textos visibles.
- `Record<ExerciseStatus, string>` hace que el compilador exija una etiqueta por cada estado.
- Si en el futuro se requiere i18n, el cambio se limita a la capa `presentation`.

**Costos.** Cambiar los textos actuales de la interfaz. No altera el comportamiento.

### D3. Controles de la sesión como métodos del store

**Contexto.** El reto pide orquestar casos de uso. Cargar el entrenamiento accede a un puerto y crea la sesión, mientras que iniciar, pausar y reiniciar solo delegan en funciones puras del dominio.

**Decisión.** `LoadWorkoutUseCase` es una clase propia. Iniciar, pausar y reiniciar son métodos de `WorkoutSessionStore`, que además coordina el `Ticker`.

**Alternativa descartada.** Una clase por acción coincide literalmente con el término "caso de uso", pero serían clases de una línea que añaden indirección sin aportar comportamiento.

**Justificación.** Todo el flujo de la sesión se lee en un solo lugar, y esos métodos se prueban igual que un caso de uso.

**Costos.** Si los controles ganaran reglas propias, habría que extraerlos a casos de uso independientes.
