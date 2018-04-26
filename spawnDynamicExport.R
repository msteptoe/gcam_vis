# Only for testing commend out otherwise
# dbDir <- "D:/msteptoe/Documents/R/scenarios"
# dbDir <- "/pic/projects/GCAM/cornell_data/NO_TAX/"
# db <- "database_basexdb_0"
# dataDir <- "data/"
# scenarioName <- "db_0"
# firstScenario <- TRUE

# Check user library path
# Sys.getenv("R_LIBS_USER")

# Supress Warnings
options(warn=-1)

# Load rgcam
# library(rgcam, lib.loc = "~/R/x86_64-pc-linux-gnu-library/3.3")
library(rgcam)

#Load R object to/from JSON library
library("jsonlite")

args = commandArgs(trailingOnly=TRUE)

if (length(args) == 5 || length(args) == 6) {
  # default output file
  # print(args)
  dbDir <- args[1]
  db <- args[2]
  dataDir <- args[3]
  scenarioName <- args[4]
  firstScenario <- args[5]
  sampleQuery <- TRUE
} else if (length(args) == 7) {
  # default output file
  # print(args)
  dbDir <- args[1]
  db <- args[2]
  dataDir <- args[3]
  scenarioName <- args[4]
  firstScenario <- args[5]
  sampleQuery <- args[6]
  queryFile<- args[7]
} else {
  # default output file
  print(args)
  stop(paste0("Incorrect number of arguments, expecting 6/7 got ", length(args)), call.=FALSE)
}

# Attach input from Node.js
# attach(input[[1]])

# Load sample queries from rgcam package
# SAMPLE.QUERIES <- system.file("ModelInterface", "sample-queries.xml",
#                               package="rgcam")

# Connect to the specified database and create a project from the last scenario
conn <- localDBConn(dbDir, db)
if(sampleQuery){
  scenario.proj <- addScenario(conn, paste0(dataDir, scenarioName, ".proj"),  saveProj=FALSE)
} else{
  scenario.proj <- addScenario(conn, paste0(dataDir, scenarioName, ".proj"),  saveProj=FALSE, queryFile=queryFile)
}

# All queries ran
queryList = listQueries(scenario.proj)

if(is.null(queryList)){
  stop("Invalid Database", call.=FALSE)
}

# Create vector to store unique years and regions observed across all queries
allYears <- numeric()
allRegions <- vector()
allData <- vector()
allPaths <- vector()
allKeys <- list()
allUnits <- list()

# Directories to create and paths for data files
# directories <- c("QueryVectors/", "ClusterAssignments/", "PCAs/", "Extents/")
directories <- c("QueryVectors/", "ClusterAssignments/", "PCAs/", "ClusterCenters/", "CombinedData/")

# Create list to store data to write for each query
dataToWrite <- list()

# Iterate over each query in the list of queries ran on the db
for(query in queryList){
  # If first scenario then create Query directory and directories for queries
  if(firstScenario){
    for(directory in directories){
      toCreate <- paste0(dataDir, directory, query, "/")
      dir.create(toCreate, recursive=TRUE)
    }
  }

  # Get the results for the current query
  queryResults <- getQuery(scenario.proj, query)
  
  # Get the variable names from the query
  cols <- colnames(queryResults)
  # Remove variables that don't need to be iterated over
  cols <- cols[cols != 'Units' & cols != 'scenario' & cols != 'year']
  
  # Extract Units, year, and region from the query, and build a year map for the query
  units <- queryResults[['Units']][1]
  year <- unique(queryResults[['year']])
  yearMap <- setNames(as.list(seq(0, (length(year) - 1))), year)
  allYears <- sort(unique(c(allYears, year)))
  region <- unique(queryResults[['region']])
  allRegions <- sort(unique(c(allRegions, region)))
  
  # Calculate the scenario level data for the current query
  allValues <- unname(split(queryResults[['value']], ceiling(seq_along(queryResults[['value']])/length(year))))
  scenarioData <- Reduce("+", allValues)
  
  # Store extracted variables to be written upon completion
  toWrite <- list('units'=units, 'years'=year, 'yearMap'=yearMap, 'regions'=region, 'scenarioData'=scenarioData)
  
  # Create a list to store the data from the variables to be iterated over
  dataList <- list()
  keys <- list()
  maxSum <- 0
  minSum <- 0
  maxMean <- 0
  minMean <- 0
  colIndex <- 1
  for(col in cols){
    # Split the data for the current variable into year length vectors
    rowIndex <- 1
    temp <- unname(split(queryResults[[col]], ceiling(seq_along(queryResults[[col]])/length(year))))
    
    # Iterate over each vector and store it in the data list
    for(row in temp){
      if(colIndex == 1){
        dataList[[rowIndex]] <- list() 
      }
      
      # If the col is 'value' then store the entire vector
      if(col == 'value'){
        dataList[[rowIndex]][[col]] <- row
        
        # Compute the sum of the row and update the max sum
        valSum <- sum(row)
        if(maxSum < valSum){
          maxSum <- valSum
        }
        
        if(rowIndex == 1 | minSum > valSum){
          minSum <- valSum
        }
        
        valMean <- mean(row, na.rm = TRUE)
        if(maxMean < valMean){
          maxMean <- valMean
        }
        
        if(rowIndex == 1 | minMean > valMean){
          minMean <- valMean
        }
      }
      # Otherwise only store the first value to save space
      else{
        dataList[[rowIndex]][[col]] <- row[1]
      }
      rowIndex <- 1 + rowIndex
    }
    
    if(col != 'value' & col != 'region'){
      keys[[col]] <- unique(queryResults[[col]])

      for(key in keys[[col]]){
        if(firstScenario){
          for(directory in directories){
            toCreate <- paste0(dataDir, directory, query, "/", col, "/", key, "/")
            dir.create(toCreate, recursive=TRUE)
          }
          path2Write <- paste0(query, "/", col, "/", key, "/")
          allPaths <- c(allPaths, path2Write)
        }
        valueVector <- queryResults[queryResults[[col]] == key,]
        jsonFile <- paste0(dataDir, "QueryVectors/", query, "/", col, "/", key, "/", scenarioName, ".json")
        write_json(valueVector[['value']], jsonFile)
      }
    }
    
    colIndex <- 1 + colIndex
  }

  # If there are no variables for the query then write query data as vector
  if(length(cols) <= 2){
    if(firstScenario){
      path2Write <- paste0(query, "/")
      allPaths <- c(allPaths, path2Write)
    }
    jsonFile <- paste0(dataDir, "QueryVectors/", query, "/", scenarioName, ".json")
    write_json(queryResults[['value']], jsonFile)
  }

  # Store the data list and keys with extracted query info
  toWrite[['data']] <- dataList
  toWrite[['keys']] <- keys
  toWrite[['maxSum']] <- maxSum
  toWrite[['minSum']] <- minSum
  toWrite[['maxMean']] <- maxMean
  toWrite[['minMean']] <- minMean
  
  # Store all query extracted information in object to be written
  dataToWrite[[query]] <- toWrite
  allKeys[[query]] <- keys
  allUnits[[query]] <- units
  allData <- c(allData, queryResults[['value']])
}

# Store scenario information
scenario <- list(
  'name'= scenarioName,
  'years'= allYears,
  'regions' = allRegions
)

# Store object information
objectToWrite <- list(
  'scenario'=scenario,
  'queries'=listQueries(scenario.proj),
  'data'=dataToWrite
)

# Write the scenario to a json file, unbox vectors of length 1
jsonFile <- paste0(dataDir, "ScenarioData/", scenarioName, ".json")
write_json(objectToWrite, jsonFile, auto_unbox=TRUE)

# Write the scenario vector to a json file
jsonFile <- paste0(dataDir, "ScenarioVectors/", scenarioName, ".json")
write_json(allData, jsonFile)

# If this is the first scenario Write the queries, variables, and keys to a json file,
# write all file paths to a json file
if(firstScenario){
  jsonFile <- paste0(dataDir, "Keys.json")
  write_json(allKeys, jsonFile)

  jsonFile <- paste0(dataDir, "Units.json")
  write_json(allUnits, jsonFile, auto_unbox=TRUE)
  
  jsonFile <- paste0(dataDir, "Regions.json")
  write_json(allRegions, jsonFile, auto_unbox=TRUE)
  
  jsonFile <- paste0(dataDir, "Years.json")
  write_json(allYears, jsonFile, auto_unbox=TRUE)
}

#jsonFile
#paste0(dataDir, scenarioName)