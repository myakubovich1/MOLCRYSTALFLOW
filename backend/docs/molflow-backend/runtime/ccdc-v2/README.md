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

The later lab CSP inference kit supplied the missing feature computation. The
nine descriptors are raw rather than separately normalized. The backend
supports:

- `inference_kit` (default): seven geometric and two basic descriptors from the
  supplied inference workflow. Planarity uses the kit's documented I2/I1
  approximation.
- `factory`: an optional independently verified exact Python feature function.
- `neutral`: zero-valued descriptors, blocked unless explicitly enabled for
  rollback diagnostics.

Neutral mode is not suitable for scientific generation. It produced
out-of-distribution inputs and compressed candidate cells during validation.
