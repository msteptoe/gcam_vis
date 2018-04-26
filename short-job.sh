#!/bin/zsh
#SBATCH -A GCAM
#SBATCH -p short,slurm
#SBATCH -t 03:00:00
#SBATCH -N 1
#SBATCH -J gcam_sS

job=$SLURM_JOB_NAME

node Process.js $1 $2 $SLURM_JOBID "short"
