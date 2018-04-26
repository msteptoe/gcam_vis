import sys
import pandas as pd
import numpy as np
import json

if len(sys.argv) > 1:
	print sys.argv[1]
	test = np.asarray(eval(sys.argv[1]))
	test



df = pd.read_csv(
    filepath_or_buffer='https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data',
    header=None,
    sep=',')

df.columns=['sepal_len', 'sepal_wid', 'petal_len', 'petal_wid', 'class']
df.dropna(how="all", inplace=True) # drops the empty line at file-end

# split data table into data X and class labels y

X = df.ix[:,0:4].values
y = df.ix[:,4].values

# print json.dumps(X.tolist())
# print X.tolist()

from sklearn.preprocessing import StandardScaler
X_std = StandardScaler().fit_transform(X)

from sklearn.decomposition import PCA as sklearnPCA
sklearn_pca = sklearnPCA(n_components=2)
Y_sklearn = sklearn_pca.fit_transform(X_std)

print Y_sklearn.tolist()