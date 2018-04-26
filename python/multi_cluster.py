import sys
import numpy as np
import os
import warnings

from sklearn.cluster import MiniBatchKMeans
from sklearn.cluster import KMeans
from sklearn.cluster import DBSCAN
from json import dump


def mainFunc(): 
    warnings.filterwarnings('ignore')

    jobPath = 'jobs' + os.path.sep + 'test'
    query = 'Building floorspace' + os.path.sep + 'building' + os.path.sep + 'comm'
    dataType = 'QueryVectors'
    algorithm = 'MiniBatchKMeans'
    # print(len(sys.argv))
    if len(sys.argv) > 4 and sys.argv[4]:
        algorithm = sys.argv[4]
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

    if 'KMeans' in algorithm:
        for n_clusters in range(3, 9):
            if n_clusters <= len(files):
                kmeans = 0
                ktype = ''

                if algorithm == 'KMeans':
                    kmeans = KMeans(n_clusters=n_clusters, random_state=0, n_jobs=-4).fit(X)
                    ktype = 'k'
                elif algorithm == 'MiniBatchKMeans':
                    kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=0).fit(X)
                    ktype = 'mk'
                
                dump(kmeans.labels_.tolist(), open(jobPath + os.path.sep + 'ClusterAssignments' + os.path.sep + query + os.path.sep + ktype + str(n_clusters) + '.json', 'w'))

    elif algorithm == 'DBSCAN':
        db = DBSCAN(n_jobs=-4).fit(X)
        dump(db.labels_.tolist(), open(jobPath + os.path.sep + 'ClusterAssignments' + os.path.sep + query + os.path.sep + 'dbscan' + str(n_clusters) + '.json', 'w'))
    
if __name__ == '__main__':
    mainFunc()
