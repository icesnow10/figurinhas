'use client';

import * as faceapi from '@vladmandic/face-api';
import type { DetectorModel, MatchConfig } from './faceTypes';
import { MODELS_URL } from './faceConfig';

let modelsLoadedFor: DetectorModel | null = null;

export async function loadModels(detector: DetectorModel): Promise<void> {
  if (modelsLoadedFor === detector) return;

  await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);

  if (detector === 'tiny_face_detector') {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
  } else {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
  }

  modelsLoadedFor = detector;
}

function detectorOptions(cfg: MatchConfig): faceapi.TinyFaceDetectorOptions | faceapi.SsdMobilenetv1Options {
  if (cfg.detector === 'tiny_face_detector') {
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: cfg.detectionConfidence,
    });
  }
  return new faceapi.SsdMobilenetv1Options({
    minConfidence: cfg.detectionConfidence,
  });
}

function preprocessImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  cfg: MatchConfig
): HTMLCanvasElement {
  const w =
    (source as HTMLImageElement).naturalWidth ??
    (source as HTMLVideoElement).videoWidth ??
    (source as HTMLCanvasElement).width;
  const h =
    (source as HTMLImageElement).naturalHeight ??
    (source as HTMLVideoElement).videoHeight ??
    (source as HTMLCanvasElement).height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const filters: string[] = [];
  if (cfg.preprocess.contrastBoost) filters.push('contrast(1.25)', 'saturate(1.05)');
  if (cfg.preprocess.grayscale) filters.push('grayscale(1)');
  if (filters.length) ctx.filter = filters.join(' ');

  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

export async function getDescriptor(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  cfg: MatchConfig
): Promise<Float32Array | null> {
  await loadModels(cfg.detector);

  const input = preprocessImage(source, cfg);
  const opts = detectorOptions(cfg);

  const detection = await faceapi
    .detectSingleFace(input, opts as any)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return detection.descriptor;
}

export async function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
