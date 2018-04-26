import sys
import numpy as np
import os
import warnings

from sklearn.manifold import TSNE
from json import dump

warnings.filterwarnings("ignore")

jobPath = "jobs" + os.path.sep + "test"
query = 'Building floorspace' + os.path.sep + 'building' + os.path.sep + 'comm'
n_components = 2

if len(sys.argv) > 3 and sys.argv[3]:
    n_components = int(sys.argv[3])
if len(sys.argv) > 2 and sys.argv[1] and sys.argv[2]:
    jobPath = sys.argv[1]
    query = sys.argv[2]

file2Write = jobPath + os.path.sep + 'TSNEs' + os.path.sep + query + os.path.sep + "tsne" + str(n_components) + ".json"


f = open(jobPath + os.path.sep + 'PCAs' + os.path.sep + query + os.path.sep + "pca50.json", "r")
X = np.array(eval(f.read()))
f.close()


X_embedded = TSNE(n_components=n_components).fit_transform(X)


if not os.path.exists(os.path.dirname(file2Write)):
    try:
        os.makedirs(os.path.dirname(file2Write))
    except OSError as exc: # Guard against race condition
        if exc.errno != errno.EEXIST:
            raise

dump(X_embedded.tolist(), open(file2Write, "w"))