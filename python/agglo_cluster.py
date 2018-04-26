import sys
import numpy as np
import os
import warnings
import csv
import itertools

from scipy.cluster.hierarchy import dendrogram, linkage, to_tree
from scipy.spatial.distance import pdist
from json import dump

warnings.filterwarnings("ignore")

jobPath = "jobs" + os.path.sep + "Demo"
# print(len(sys.argv))
if len(sys.argv) > 1 and sys.argv[1]: jobPath = sys.argv[1]


# Start input code
f = open('data/Inputs.csv', 'r')
reader = csv.reader(f)
inputs = list(reader) 
setList = list()
f.close()

for i in range(len(inputs[0]) - 1):
    setList.append(set())

for rdx, row in enumerate(inputs):
    if rdx > 0:
        for idx, value in enumerate(row):
            if idx > 0:
                setList[idx - 1].add(value)

inputList = list();
for element in setList:
    tempList = list(element)
    tempList.sort()
    inputList.append(tempList)
# End input code

f = open(jobPath + os.path.sep + 'Files.json', 'r')
files = eval(f.read())
f.close()

X = []
for f in files:
    # print jobPath + '/ScenarioVectors/' + f
    fOpen = open(jobPath + os.path.sep + 'ScenarioVectors' + os.path.sep + f, 'r')
    X.append(eval(fOpen.read()))
    fOpen.close()
X = np.array(X)

# Determine distances (default is Euclidean)
distMat = pdist( X )

# Cluster hierarchicaly using scipy
clusters = linkage(distMat, method='ward')
T = to_tree( clusters , rd=False )

# Create dictionary for labeling nodes by their IDs
id2name = dict(zip(range(len(files)), files))

def getMatrix(db0):
    matrix = list()
    
    for edx, element in enumerate(inputs[db0 + 1]):
#         print(input0, input1)
        if edx > 0:
            idx = edx - 1
            matrix.append([0] * len(inputList[idx]))
            matrix[idx][inputList[idx].index(element)] = 1
    
    return matrix

def getMergedMatrix(matrix0, matrix1):
    matrix = list()
    ldx = 0
    for list0, list1 in itertools.izip(matrix0, matrix1):
        matrix.append(list())
        
        for element0, element1 in itertools.izip(list0, list1):
            matrix[ldx].append(element0 + element1)
    
        ldx += 1
        
    return matrix

# Create a nested dictionary from the ClusterNode's returned by SciPy
def add_node(node, parent, root=False ):
    # First create the new node and append it to its parent's children
    newNode = dict( node_id=node.id, children=[], dist=node.dist )
    
    if root:
        newNode = parent
    
    else:
        parent["children"].append( newNode )

    # Recursively add the current node's children
    if node.left: left = add_node( node.left, newNode )
    if node.right: right = add_node( node.right, newNode )

    # If node is a leaf then add its input matrix
    if node.is_leaf(): newNode["matrix"] = getMatrix(int(id2name[node.id].split("_")[1].split(".json")[0]))

    if not node.is_leaf(): newNode["matrix"] = getMergedMatrix(left["matrix"], right["matrix"])

    return newNode


# Initialize nested dictionary for d3, then recursively iterate through tree
d3Dendro = dict(children=[], name="Scenarios")
add_node( T, d3Dendro, True )

def getMatrixDifference(matrix0, matrix1):
    diff = list()
    ldx = 0
    for list0, list1 in itertools.izip(matrix0, matrix1):
        diff.append(0)
        
        for element0, element1 in itertools.izip(list0, list1):
            diff[ldx] += abs(element0 - element1)
    
        ldx += 1
    
    return diff.index(max(diff))

# Label each node with the names of each leaf in its subtree
def label_tree( n ):
    # If the node is a leaf, then we have its name
    if len(n["children"]) == 0:
        leafNames = [ id2name[n["node_id"]] ]
        n["name"] = name = leafNames[0]

    # If not, flatten all the leaves in the node's subtree
    else:
        # print(n["children"][0]["matrix"], n["children"][1]["matrix"])
        leafNames = reduce(lambda ls, c: ls + label_tree(c), n["children"], [])
        n["name"] = name = "dist: " + "{0:.2f}".format(n["dist"])
        n["color"] = getMatrixDifference(n["children"][0]["matrix"], n["children"][1]["matrix"])

    # Delete the node id since we don't need it anymore and
    # it makes for cleaner JSON
    del n["node_id"]
    del n["dist"]
    # del n["matrix"]

    # Labeling convention: "-"-separated leaf names
    #n["name"] = name = "-".join(sorted(map(str, leafNames)))

    return leafNames


label_tree( d3Dendro["children"][0] )
label_tree( d3Dendro["children"][1] )
d3Dendro["color"] = getMatrixDifference(d3Dendro["children"][0]["matrix"], d3Dendro["children"][1]["matrix"])


# Output to JSON
# dump(d3Dendro, open(jobPath + "/d3-dendrogram.json", "w"), sort_keys=True, indent=4)
dump(d3Dendro, open(jobPath + os.path.sep + "d3-dendrogram.json", "w"), sort_keys=True)
