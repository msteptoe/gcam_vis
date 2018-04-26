#!/bin/zsh
#SBATCH -A GCAM
#SBATCH -p slurm
#SBATCH -t 05:00:00
#SBATCH -N 1
#SBATCH -J gcam_sL

job=$SLURM_JOB_NAME

node Process.js $1 $2 $SLURM_JOBID "long"
