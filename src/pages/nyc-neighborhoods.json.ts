// The shapes the trash-club map draws (ClubMap.astro fetches this). Built from
// src/data/nyc-neighborhoods.geojson + src/data/trash-clubs.json — see
// src/data/trash-clubs.ts. A file of its own rather than inlined in the page,
// because at a few hundred kB it would otherwise ride along in the HTML.
import { MAP_FEATURES } from "../data/trash-clubs";

export const GET = () => new Response(JSON.stringify(MAP_FEATURES));
