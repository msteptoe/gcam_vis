import sys
import numpy as np
import os
import warnings

from sklearn.decomposition import IncrementalPCA, PCA
from sklearn.preprocessing import scale
from json import dump

warnings.filterwarnings("ignore")

jobPath = "jobs" + os.path.sep + "test"
query = 'Building floorspace' + os.path.sep + 'building' + os.path.sep + 'comm'
dataType = 'QueryVectors'

# print(len(sys.argv))
if len(sys.argv) > 3 and sys.argv[3]:
    dataType = sys.argv[3]
if len(sys.argv) > 2 and sys.argv[1] and sys.argv[2]:
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

# Scale values since they are a mix of different scales
if dataType == 'ScenarioVectors':
    X = scale(X)

ipca = IncrementalPCA(n_components=5)
X_ipca = ipca.fit_transform(X)

# Get the component weights
# print ipca.components_

dump(X_ipca.tolist(), open(jobPath + os.path.sep + 'PCAs' + os.path.sep + query + os.path.sep + "pca.json", "w"))
