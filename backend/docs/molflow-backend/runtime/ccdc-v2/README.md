# Bundled CCDC v2 runtime

This directory contains the Python model source and the epoch-436 checkpoint
extracted from `molcrystalflow_v2.zip`.

Checkpoint:

```text
checkpoints/best.ckpt
epoch: 436
step: 1217482
validation loss: 1.1853
SHA256: cf841452a9eb9bc2300e760ef5fe072337167e8fcd87adf91408804c60b873bf
```

`checkpoints/config.yaml` is the checkpoint's resolved training configuration.

The original archive did not include the code that generated the normalized
basic and geometric descriptors loaded by `molcrystalflow/data/dataset.py`.
The backend therefore supports:

- `neutral`: known PCA inputs plus nine zero-valued normalized descriptors.
- `factory`: a lab-provided Python feature function with the exact descriptors.

The neutral mode is an engineering compatibility fallback, not proof of
scientific equivalence to the lab inference pipeline.
