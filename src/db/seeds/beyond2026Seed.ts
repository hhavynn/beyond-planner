import { Artist, ArtistSet, Festival, FestivalDay, Stage } from "@/domain/models";

export const beyond2026FestivalSeed: Festival = {
  id: "festival_beyond_2026",
  slug: "beyond-wonderland-socal-2026",
  name: "Beyond Planner",
  editionLabel: "Beyond Wonderland SoCal 2026",
  timezone: "America/Los_Angeles",
  city: null,
  state: null,
  contentVersion: 1,
};

export const beyond2026DaySeeds: FestivalDay[] = [
  {
    id: "festival_day_1",
    festivalId: beyond2026FestivalSeed.id,
    label: "Day 1",
    dateLocal: null,
    sortOrder: 1,
  },
  {
    id: "festival_day_2",
    festivalId: beyond2026FestivalSeed.id,
    label: "Day 2",
    dateLocal: null,
    sortOrder: 2,
  },
];

export const beyond2026StageSeeds: Stage[] = [
  {
    id: "stage_cheshire_woods",
    festivalId: beyond2026FestivalSeed.id,
    dayId: null,
    name: "Cheshire Woods",
    slug: "cheshire-woods",
    areaKind: "stage",
    sortOrder: 1,
  },
  {
    id: "stage_queen_domain",
    festivalId: beyond2026FestivalSeed.id,
    dayId: null,
    name: "Queen's Domain",
    slug: "queens-domain",
    areaKind: "stage",
    sortOrder: 2,
  },
  {
    id: "stage_mad_hatters",
    festivalId: beyond2026FestivalSeed.id,
    dayId: null,
    name: "Mad Hatter's Castle",
    slug: "mad-hatters-castle",
    areaKind: "stage",
    sortOrder: 3,
  },
];

export const beyond2026ArtistSeeds: Artist[] = [
  {
    id: "artist_sample_1",
    slug: "sample-artist-1",
    name: "Sample Artist One",
  },
  {
    id: "artist_sample_2",
    slug: "sample-artist-2",
    name: "Sample Artist Two",
  },
];

export const beyond2026SetSeeds: ArtistSet[] = [
  {
    id: "set_sample_day1_1",
    festivalId: beyond2026FestivalSeed.id,
    dayId: "festival_day_1",
    stageId: "stage_cheshire_woods",
    artistId: "artist_sample_1",
    title: "Sample Artist One",
    startsAt: "2026-01-01T18:00:00-08:00",
    endsAt: "2026-01-01T19:00:00-08:00",
    isPlaceholder: true,
  },
  {
    id: "set_sample_day1_2",
    festivalId: beyond2026FestivalSeed.id,
    dayId: "festival_day_1",
    stageId: "stage_queen_domain",
    artistId: "artist_sample_2",
    title: "Sample Artist Two",
    startsAt: "2026-01-01T19:30:00-08:00",
    endsAt: "2026-01-01T20:30:00-08:00",
    isPlaceholder: true,
  },
];
