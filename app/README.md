# Backend

## Table of Contents
- [Prompting Graph](#PromptingGraph)
- [RAG](#Deployment)
- [Miscellaneous](#Miscellaneous)

---

## PromptingGraph

flowchart TD

  %% ========== Chat Mode ==========
  subgraph A[Chat Mode]
    direction TB
    Astart([Start]):::entry
    Aconv[conv_action_detection]
    Aambi[ambiguity_detection]
    Aknn[knn_relevance_check]
    Arac[rac]
    Asearch[search]
    Afin[finalize]
    Aend([END]):::exit

    %% Entry point
    Astart --> Aconv

    %% conv_action_detection branching
    Aconv -->|advance| Aambi
    Aconv -->|search| Asearch
    Aconv -->|end| Afin
    Aconv -->|error| Afin

    %% ambiguity_detection branching
    Aambi -->|advance| Aknn
    Aambi -->|continue| Afin
    Aambi -->|end| Afin
    Aambi -->|error| Afin

    %% knn_relevance_check branching
    Aknn -->|advance| Arac
    Aknn -->|search| Asearch
    Aknn -->|end| Afin
    Aknn -->|error| Afin

    %% rac branching
    Arac -->|search| Asearch
    Arac -->|continue| Afin
    Arac -->|error| Afin

    %% Converge to finalize
    Asearch --> Afin
    Afin --> Aend
  end

  %% ========== Non-Chat Mode ==========
  subgraph B[Non-Chat Mode]
    direction TB
    Bstart([Start]):::entry --> Bnl2sru[nl2sru] --> Bfin[finalize] --> Bend([END]):::exit
  end

  %% Style definitions
  classDef entry fill:#e7f5ff,stroke:#1c7ed6,color:#1c7ed6;
  classDef exit fill:#e6fcf5,stroke:#099268,color:#099268;
