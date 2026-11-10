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
