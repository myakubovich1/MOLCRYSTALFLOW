from typing import Any, Dict, Literal, List, Optional

from pydantic import BaseModel, Field

from .config import DEFAULT_Z_VALUES


class FilteringOptions(BaseModel):
    geometryEnabled: bool = True
    clashThresholdRatio: float = Field(default=0.65, ge=0.1, le=1.5)
    maxClashCount: int = Field(default=0, ge=0)
    minDensityGcm3: Optional[float] = Field(default=None, gt=0)
    maxDensityGcm3: Optional[float] = Field(default=None, gt=0)
    energyEnabled: bool = False
    maxRelativeEnergyEvPerMolecule: Optional[float] = Field(default=None, ge=0)
    relaxationSteps: int = Field(default=0, ge=0, le=2000)
    relaxationFmaxEvPerAngstrom: float = Field(default=0.2, gt=0)
    maxForceEvPerAngstrom: Optional[float] = Field(default=None, gt=0)


class JobCreateRequest(BaseModel):
    xyzText: str = Field(..., min_length=1)
    originalFilename: Optional[str] = "input.xyz"
    inputMode: Optional[Literal["upload", "paste", "manual"]] = "upload"
    zValues: List[int] = Field(default_factory=lambda: list(DEFAULT_Z_VALUES))
    numSamples: int = Field(default=20, ge=1, le=100)
    filtering: FilteringOptions = Field(default_factory=FilteringOptions)


class ArtifactInfo(BaseModel):
    name: str
    sizeBytes: int
    url: str


class JobStatusResponse(BaseModel):
    jobId: str
    status: Literal["queued", "running", "completed", "failed"]
    originalFilename: Optional[str] = None
    formula: Optional[str] = None
    atomCount: Optional[int] = None
    zValues: List[int] = Field(default_factory=list)
    candidateCount: Optional[int] = None
    generatedCandidateCount: Optional[int] = None
    filterSummary: Optional[Dict[str, Any]] = None
    artifacts: List[ArtifactInfo] = Field(default_factory=list)
    logTail: List[str] = Field(default_factory=list)
    generatorBackend: Optional[str] = None
    modelVersion: Optional[str] = None
    featureMode: Optional[str] = None
    generationSeed: Optional[int] = None
    error: Optional[str] = None
