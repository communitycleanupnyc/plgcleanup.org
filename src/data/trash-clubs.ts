// ============================================================================
//  THE TRASH CLUB MAP
// ============================================================================
//
//  Every club on /new-york-trash-clubs lives in the "clubs" list in
//  src/data/trash-clubs.json — one row each: name, url, where (the words shown
//  in the list), and where it goes on the map. Edit them in Pages CMS (the
//  "Trash clubs" form) or in trash-clubs.json directly on GitHub.
//
//  A row goes on the map in one of three ways:
//    • "neighborhood": a neighborhood's id, e.g. "greenpoint-brooklyn" — its
//      name and borough, lowercase, joined by dashes. That neighborhood is
//      shaded and labelled, and clicking it opens the club's link. One club
//      per neighborhood; give a second club there a "point" instead. A club
//      that spans neighborhoods lists them all, separated by commas:
//      "fort-tilden-queens, breezy-point-queens". The ids are the "slug" values in
//      src/data/nyc-neighborhoods.geojson; a mistyped one fails the build.
//    • "point": [longitude, latitude] — for a club with no home neighborhood.
//      (Pick Up Pigeons sits in the East River, because pigeons fly.)
//    • neither — the club is listed under the map but not drawn on it.
//
//  The map opens framed around every club on it. A club far from the rest
//  (the Fort Tilden beach, Staten Island) can say "startView": false to stay on the map but
//  out of that first view, so it doesn't shrink everyone else.
//
//  Each club on the map gets a colour from Observable 10, a palette from
//  d3-scale-chromatic designed to stay tellable-apart for colourblind readers
//  and on dark backgrounds. It has ten colours, so far-apart clubs share them;
//  clubs next to each other never do (see colorOf below).
//
//  The neighborhood shapes are Chris Whong's NYC Neighborhood Boundaries
//  (github.com/chriswhong/nyc-neighborhood-boundaries, CC BY-SA 4.0), kept
//  unmodified in nyc-neighborhoods.geojson. To update them, replace that file
//  with the repo's dist/nyc-neighborhood-boundaries.geojson.
//
//  Everything below is code that builds the map from those values — please
//  don't edit it.
// ============================================================================

import { z } from "astro/zod";
import clubData from "./trash-clubs.json";
import rawNeighborhoods from "./nyc-neighborhoods.geojson?raw";
import { schemeObservable10 } from "d3-scale-chromatic";

const filled = (field: string) => z.string().trim().min(1, `${field} must not be empty.`);

const { intro, clubs } = z
  .object({
    intro: filled("The intro"),
    clubs: z
      .array(
        z.object({
          name: filled("A club's name"),
          url: filled("A club's link"),
          where: filled("A club's area"),
          neighborhood: z.string().trim().min(1).optional(),
          point: z.tuple([z.number(), z.number()]).optional(),
          startView: z.boolean().optional(),
        }),
        { error: 'src/data/trash-clubs.json must hold a "clubs" list, in [ … ] brackets.' },
      )
      .min(1, "The trash club list is empty."),
  })
  .parse(clubData);

/** The paragraph under the page heading. */
export const CLUBS_INTRO = intro;
/** Every club, in the order typed — the list under the map. */
export const CLUBS = clubs;

type Position = number[];
type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };
interface Feature {
  type: "Feature";
  properties: { slug: string; name: string; club?: string; url?: string; color?: string };
  geometry: Geometry;
}

const source: { features: { properties: Record<string, unknown>; geometry: Geometry }[] } =
  JSON.parse(rawNeighborhoods);

/** What a club adds to the shape or pin it's drawn as. */
type ClubProps = { club: string; url: string; color: string };
type Club = (typeof clubs)[number];

/** A club's neighborhood ids. Several may be given, comma-separated. */
const slugsOf = (club: Club) =>
  (club.neighborhood ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

/** A club's extent on the map, [west, south, east, north] — its shape's or its pin's. */
const boxOf = (club: Club) => {
  const where =
    club.point ??
    source.features
      .filter((f) => slugsOf(club).includes(f.properties.slug as string))
      .map((f) => f.geometry.coordinates);
  const nums = [where].flat(Infinity) as number[];
  const lngs = nums.filter((_, i) => i % 2 === 0);
  const lats = nums.filter((_, i) => i % 2 === 1);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};
// ~500 m: shapes this close (or touching) count as neighbours on the map.
const NEAR = 0.005;
const near = (a: number[], b: number[]) =>
  a[0] - NEAR <= b[2] && b[0] - NEAR <= a[2] && a[1] - NEAR <= b[3] && b[1] - NEAR <= a[3];

// Each club, in list order, takes the least-used palette colour that no club
// already coloured next to it is using — so neighbouring clubs never share a colour,
// and adding a club never recolours the ones before it. (Neighbours are judged
// by bounding box, which errs towards calling two clubs neighbours; with ten
// colours that costs nothing.) Only if every colour is taken nearby does a
// club fall back to cycling through the palette.
const colorOf = new Map<Club, string>();
clubs
  .filter((c) => c.neighborhood || c.point)
  .forEach((club, i) => {
    const box = boxOf(club);
    const nearby = new Set(
      [...colorOf].filter(([other]) => near(box, boxOf(other))).map(([, color]) => color),
    );
    const uses = (color: string) => [...colorOf.values()].filter((c) => c === color).length;
    // Of the colours free here, the least used so far — so the map keeps all
    // ten in play instead of painting every far-apart club the first one.
    const free = schemeObservable10
      .filter((color) => !nearby.has(color))
      .sort((a, b) => uses(a) - uses(b))[0];
    colorOf.set(club, free ?? schemeObservable10[i % schemeObservable10.length]);
  });

const propsOf = (club: Club): ClubProps => ({
  club: club.name,
  url: club.url,
  color: colorOf.get(club)!,
});

// Clubs by the neighborhood they're drawn in.
const clubsIn = new Map<string, ClubProps>();
for (const club of clubs) {
  if (club.neighborhood && club.point) {
    throw new Error(
      `"${club.name}" has both a "neighborhood" and a "point" in src/data/trash-clubs.json. Keep one.`,
    );
  }
  for (const slug of slugsOf(club)) {
    if (!source.features.some((f) => f.properties.slug === slug)) {
      throw new Error(
        `"${club.name}" is in the neighborhood "${slug}", which isn't on the map. ` +
          `Write it as the name and borough, lowercase, joined by dashes ("greenpoint-brooklyn"), ` +
          `or look up the "slug" in src/data/nyc-neighborhoods.geojson.`,
      );
    }
    // A shape opens one link when clicked, so it can only belong to one club.
    const taken = clubsIn.get(slug);
    if (taken) {
      throw new Error(
        `"${club.name}" and "${taken.club}" are both in "${slug}" in src/data/trash-clubs.json. ` +
          `A neighborhood can hold one club — give the other a "point" inside it instead.`,
      );
    }
    clubsIn.set(slug, propsOf(club));
  }
}

// Every whole neighborhood is outlined. A sub-neighborhood (Prospect Lefferts
// Gardens sits inside Flatbush) is drawn only when a club is in it, and after
// the rest, so it lands on top of its parent and wins the hover.
const shapes: Feature[] = source.features
  .filter((f) => f.properties.kind === "neighborhood" || clubsIn.has(f.properties.slug as string))
  .sort(
    (a, b) =>
      Number(clubsIn.has(a.properties.slug as string)) -
      Number(clubsIn.has(b.properties.slug as string)),
  )
  .map((f) => {
    const slug = f.properties.slug as string;
    return {
      type: "Feature",
      properties: { slug, name: f.properties.name as string, ...clubsIn.get(slug) },
      geometry: f.geometry,
    };
  });

const points: Feature[] = clubs
  .filter((c) => c.point)
  .map((c) => ({
    type: "Feature",
    properties: { slug: `point:${c.name}`, name: c.where, ...propsOf(c) },
    geometry: { type: "Point", coordinates: c.point! },
  }));

/** What the map draws: served as /nyc-neighborhoods.json by src/pages/nyc-neighborhoods.json.ts. */
export const MAP_FEATURES = { type: "FeatureCollection", features: [...shapes, ...points] };

/** The box around every club on the map, [[west, south], [east, north]] — where the map opens. */
export const CLUBS_BOUNDS = (() => {
  const offStart = new Set(clubs.filter((c) => c.startView === false).map((c) => c.name));
  const drawn = [...shapes, ...points].filter(
    (f) => f.properties.club && !offStart.has(f.properties.club),
  );
  // No club placed on the map at all: open on the whole city instead.
  const all = (drawn.length ? drawn : shapes).flatMap(
    (f) => [f.geometry.coordinates].flat(Infinity) as number[],
  );
  const box = [
    [Infinity, Infinity],
    [-Infinity, -Infinity],
  ];
  for (let i = 0; i < all.length; i += 2) {
    box[0] = [Math.min(box[0][0], all[i]), Math.min(box[0][1], all[i + 1])];
    box[1] = [Math.max(box[1][0], all[i]), Math.max(box[1][1], all[i + 1])];
  }
  return box;
})();
