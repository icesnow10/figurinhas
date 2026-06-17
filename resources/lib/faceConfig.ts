import type { MatchConfig } from './faceTypes';

export const SCANNER_CONFIG: MatchConfig = {
  distanceThreshold: 0.55,
  detectionConfidence: 0.4,
  detector: 'tiny_face_detector',
  metric: 'euclidean',
  preprocess: {
    grayscale: false,
    contrastBoost: false,
  },
  topN: 3,
};

export const MODELS_URL = '/models';
