// Aggregator — imports every per-country embeddings bundle and exposes a
// flat array of normalized ReferenceEntry. Add a new country by adding the
// import + spread below.

import type { EmbeddingsBundle, ReferenceEntry } from '@/resources/lib/faceTypes';

import bundleAlgeria from './embeddings-algeria.json';
import bundleArgentina from './embeddings-argentina.json';
import bundleAustralia from './embeddings-australia.json';
import bundleAustria from './embeddings-austria.json';
import bundleBelgium from './embeddings-belgium.json';
import bundleBosnia from './embeddings-bosnia_herzegovina.json';
import bundleBrazil from './embeddings-brazil.json';
import bundleCanada from './embeddings-canada.json';
import bundleCapeVerde from './embeddings-cape_verde.json';
import bundleColombia from './embeddings-colombia.json';
import bundleCroatia from './embeddings-croatia.json';
import bundleCuracao from './embeddings-curacao.json';
import bundleCzechia from './embeddings-czechia.json';
import bundleDrCongo from './embeddings-dr_congo.json';
import bundleEcuador from './embeddings-ecuador.json';
import bundleEgypt from './embeddings-egypt.json';
import bundleEngland from './embeddings-england.json';
import bundleFrance from './embeddings-france.json';
import bundleGermany from './embeddings-germany.json';
import bundleGhana from './embeddings-ghana.json';
import bundleHaiti from './embeddings-haiti.json';
import bundleIran from './embeddings-iran.json';
import bundleIraq from './embeddings-iraq.json';
import bundleIvoryCoast from './embeddings-ivory_coast.json';
import bundleJapan from './embeddings-japan.json';
import bundleJordan from './embeddings-jordan.json';
import bundleMexico from './embeddings-mexico.json';
import bundleMorocco from './embeddings-morocco.json';
import bundleNetherlands from './embeddings-netherlands.json';
import bundleNewZealand from './embeddings-new_zealand.json';
import bundleNorway from './embeddings-norway.json';
import bundlePanama from './embeddings-panama.json';
import bundleParaguay from './embeddings-paraguay.json';
import bundlePortugal from './embeddings-portugal.json';
import bundleQatar from './embeddings-qatar.json';
import bundleSaudiArabia from './embeddings-saudi_arabia.json';
import bundleScotland from './embeddings-scotland.json';
import bundleSenegal from './embeddings-senegal.json';
import bundleSouthAfrica from './embeddings-south_africa.json';
import bundleSouthKorea from './embeddings-south_korea.json';
import bundleSpain from './embeddings-spain.json';
import bundleSweden from './embeddings-sweden.json';
import bundleSwitzerland from './embeddings-switzerland.json';
import bundleTunisia from './embeddings-tunisia.json';
import bundleTurkey from './embeddings-turkey.json';
import bundleUruguay from './embeddings-uruguay.json';
import bundleUsa from './embeddings-usa.json';
import bundleUzbekistan from './embeddings-uzbekistan.json';

// Some bundles came from the figurinhas pipeline (with `stickerId`), others
// from the sandbox (with `country` and lowercase codes). Normalize here.
function normalizarEntries(raw: any): ReferenceEntry[] {
  if (!raw?.entries) return [];
  return raw.entries.map((e: any) => ({
    ...e,
    code: String(e.code).toUpperCase(),
    stickerId: String(e.stickerId ?? e.code).toUpperCase(),
    url: String(e.url).replace('/api/countries/', '/countries/'),
  }));
}

const ALL_BUNDLES: EmbeddingsBundle[] = [
  bundleAlgeria, bundleArgentina, bundleAustralia, bundleAustria, bundleBelgium,
  bundleBosnia, bundleBrazil, bundleCanada, bundleCapeVerde, bundleColombia,
  bundleCroatia, bundleCuracao, bundleCzechia, bundleDrCongo, bundleEcuador,
  bundleEgypt, bundleEngland, bundleFrance, bundleGermany, bundleGhana,
  bundleHaiti, bundleIran, bundleIraq, bundleIvoryCoast, bundleJapan,
  bundleJordan, bundleMexico, bundleMorocco, bundleNetherlands, bundleNewZealand,
  bundleNorway, bundlePanama, bundleParaguay, bundlePortugal, bundleQatar,
  bundleSaudiArabia, bundleScotland, bundleSenegal, bundleSouthAfrica, bundleSouthKorea,
  bundleSpain, bundleSweden, bundleSwitzerland, bundleTunisia, bundleTurkey,
  bundleUruguay, bundleUsa, bundleUzbekistan,
] as any;

export const FACE_REFERENCES: ReferenceEntry[] = ALL_BUNDLES.flatMap((b) =>
  normalizarEntries(b)
);

export const FACE_BUNDLE_COUNT = ALL_BUNDLES.length;
