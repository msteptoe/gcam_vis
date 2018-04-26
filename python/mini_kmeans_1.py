import sys
import numpy as np
import os
import warnings

from sklearn.cluster import MiniBatchKMeans
from json import dump


def mainFunc(): 
    warnings.filterwarnings("ignore")

    jobPath = "jobs" + os.path.sep + "test"
    query = 'Building floorspace' + os.path.sep + 'building' + os.path.sep + 'comm'
    dataType = 'QueryVectors'
    # print(len(sys.argv))
    if len(sys.argv) > 3 and sys.argv[3]:
        dataType = sys.argv[3]
    if len(sys.argv) > 2 and sys.argv[1]:
        jobPath = sys.argv[1]
        query = sys.argv[2]


    f = open(jobPath + os.path.sep + 'Files.json', 'r')
    files = eval(f.read())
    f.close()


    X = []
    for f in files:
        fOpen = open(jobPath + os.path.sep + dataType + os.path.sep + query + os.path.sep + f, 'r')
        X.append(eval(fOpen.read()))
        fOpen.close()
    X = np.array(X)
    n_clusters = 8
    kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=0).fit(X)
    dump(kmeans.labels_.tolist(), open(jobPath + os.path.sep + 'ClusterAssignments' + os.path.sep + query + os.path.sep + "k" + str(n_clusters) + ".json", "w"))

if __name__ == '__main__':
    mainFunc()
