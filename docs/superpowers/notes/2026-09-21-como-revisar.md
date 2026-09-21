# Cómo correr los tests y qué mirar al revisar

Todos los comandos de acá están verificados en este repo.

## Lo básico, desde la raíz

```bash
npm test          # los 4 workspaces
npm run typecheck # incluye astro check, que revisa el frontmatter de los .astro
```

Los dos tienen que estar en verde **y con el número de tests que esperás**. Un `0 passed` también
es verde.

## Ir a un lugar puntual

```bash
cd packages/domain
npx vitest run order-storage   # filtra por nombre de ARCHIVO
npx vitest run -t "unidades"   # filtra por el texto del it()
npx vitest                     # modo watch: re-corre al guardar
```

> **Trampa:** si el filtro no matchea, vitest dice `72 skipped` y **sale con código 0**. Verde, pero
> no corrió nada. Mirá el número, no el color.

Como los nombres de los tests están en español y describen reglas del negocio, se busca por lo que
importa: `-t "vencimiento"`, `-t "tolva"`, `-t "tramo"`.

## Ver el sitio

```bash
cd apps/site && npm run dev      # http://localhost:4321 — no termina nunca, se corta con Ctrl+C
```

Para probar el Worker real, tal como corre en Cloudflare:

```bash
cd apps/site && npm run build && npx wrangler dev
```

La diferencia importa: `dev` usa Vite y es rápido; `wrangler dev` corre el bundle real sobre el
runtime de Workers. Las cabeceras de caché solo se verifican bien en el segundo.

La base local se prepara —o se repara— con un solo comando, desde la raíz:

```bash
npm run db:reset --workspace @falco/site
```

Borra la base local, aplica la migración desde cero y carga el seed. Usa `node` para borrar en vez
de `rm -rf`, así que funciona igual en Windows.

> **Por qué hace falta borrar y no solo aplicar.** Mientras el proyecto no esté desplegado, el
> esquema se edita **dentro de `0001_init.sql`** en lugar de ir agregando migraciones. Pero wrangler
> lleva la cuenta de lo aplicado **por nombre de archivo**: ve `0001_init.sql`, da por hecho que ya
> corrió y contesta `No migrations to apply!`, aunque el contenido haya cambiado por completo. El
> síntoma es un error de D1 en la primera consulta, del estilo `no such table: business_hour_shifts`.
> **Después de cada `git pull` que toque la migración, corré `db:reset`.**

> **Dev server zombi.** Astro 7 deja el servidor corriendo en segundo plano, y el viejo sigue con la
> conexión anterior a la base: arreglás el esquema y seguís viendo el mismo error. Se para con
> `cd apps/site && npx astro dev stop`.

## Qué mirar al revisar, en orden de rendimiento

### 1. ¿El test puede fallar?

Es la pregunta número uno. Rompé a propósito lo que el test dice proteger y confirmá que se pone
rojo; después restauralo y confirmá que vuelve a verde.

En este proyecto aparecieron **tres** tests que no podían fallar: uno que buscaba el prerender en el
archivo equivocado, uno que no cubría tres escalas de tokens, y uno que solo chequeaba la forma de
los horarios.

> **Meta-trampa:** cuando rompas algo para probar, verificá que **realmente rompiste**. Pasó una vez
> que la sustitución no matcheó, el código quedó intacto, y el "verde" no probaba nada.

### 2. ¿El test verifica algo, o cuenta?

Un `for` sobre una lista vacía pasa sin verificar nada. Por eso varios tests tienen una línea que
parece tonta:

```ts
expect(files.length).toBeGreaterThan(0);
```

Sin eso, el test pasa habiendo leído cero archivos.

> **Ojo con el servidor fantasma.** Si cambiás un estilo y el navegador sigue mostrando el anterior,
> no estás loco: el dev server puede seguir sirviendo la versión vieja. Antes de dar por roto un
> cambio visual, reiniciá (`npx astro dev stop` y de nuevo `npm run dev`) y recargá con la URL
> cambiada (`?bust=1`). Perdí un rato buscando un bug de CSS que no existía.

> **Y mirá la consola del navegador, no solo la pantalla.** Una isla de React puede renderizar bien
> en el servidor y **fallar al hidratarse**: el HTML aparece, React explota, y el elemento
> desaparece sin dejar rastro en la pantalla. Los tests no lo ven, porque corren en jsdom y no
> hidratan. La señal es un error tipo `dispatcher.getOwner is not a function`, que suele ser el
> **caché de dependencias de Vite** desactualizado:
>
> ```bash
> cd apps/site && npx astro dev stop && rm -rf node_modules/.vite .astro && npm run dev
> ```
>
> Para confirmar que una isla se hidrató de verdad, Astro le saca el atributo `ssr` al elemento:
> `!document.querySelector('astro-island').hasAttribute('ssr')` tiene que dar `true`.

> **Los `@import` de CSS apuntan a un archivo, no a un paquete.** Escribir
> `@import "@fontsource-variable/bricolage-grotesque";` anduvo en una máquina y en otra tiró
> `ENOENT: no such file or directory`, porque sin nombre de archivo el resolvedor lo toma como ruta
> relativa. Siempre la ruta completa: `@import "@fontsource-variable/bricolage-grotesque/wght.css";`
>
> Y cuando un `git pull` trae una dependencia nueva, hay que instalarla antes de levantar nada:
>
> ```bash
> npm install
> ```

### 3. Mirá la pantalla, no solo la consola

Los dos defectos más visibles del proyecto —las placas del café pisándose y un nav de 201 px de alto
en el celular— **no los agarró ningún test**. Aparecieron mirando la página a 375 px de ancho.

Abrí el sitio, achicá la ventana a ancho de celular y fijate: ¿hay scroll horizontal? ¿se pisa algo?
¿lo importante entra en la primera pantalla?

### 4. El diff, buscando lo que NO está

```bash
git log --oneline main..HEAD
git diff main..HEAD -- apps/site/src
```

¿Se agregó una dependencia sin declarar? ¿El código nuevo trae su test? ¿Hay un valor repetido en
dos lados que se puede desincronizar?

### 5. Específico de este proyecto: la zona horaria

```bash
TZ=Pacific/Kiritimati npm test --workspace @falco/domain
```

Kiritimati está en UTC+14: **es otro día del calendario**. Si algo se filtra la hora del dispositivo
en vez de usar la de Argentina, ahí salta.

## El resumen corto, antes de aprobar cualquier cosa

```bash
npm test && npm run typecheck
```

Los dos verdes, con los números esperados. Después abrí el sitio y miralo en celular. Y si algo te
da desconfianza, rompelo a propósito y mirá si el test se da cuenta.

**Un test que nunca viste fallar no es un test.**
