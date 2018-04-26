import sys
import pandas as pd
import numpy as np
import scipy.sparse as sparse
import warnings

if len(sys.argv) > 3:
	f = open(sys.argv[2], 'r')
	X = eval(f.read())
	f.close()
else:
	X = np.asarray(eval(sys.argv[2]))

# print X

from sklearn.preprocessing import StandardScaler
warnings.filterwarnings("ignore")
# X_std = StandardScaler().fit_transform(X)

from sklearn.decomposition import PCA as sklearnPCA
from sklearn.decomposition import RandomizedPCA as sklearnRPCA

if sys.argv[1] == 0 or sys.argv[1] == "0":
	X_std = StandardScaler().fit_transform(X)
	sklearn_pca = sklearnPCA(n_components=2, svd_solver='randomized')
	Y_sklearn = sklearn_pca.fit_transform(X_std)
elif sys.argv[1] == 1 or sys.argv[1] == "1":
	X_std = X
	sklearn_rpca = sklearnRPCA(n_components=2)
	Y_sklearn = sklearn_rpca.fit_transform(X_std)
else:
	X_std = X
	X_std = sparse.csr_matrix(X_std).toarray()
	sklearn_rpca = sklearnRPCA(n_components=2)
	Y_sklearn = sklearn_rpca.fit_transform(X_std)

print(Y_sklearn.tolist())