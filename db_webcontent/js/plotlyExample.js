Plotly.d3.csv(
    "https://raw.githubusercontent.com/plotly/datasets/master/alpha_shape.csv",
    function(err, rows) {
      function unpack(rows, key) {
        return rows.map(function(row) {
          return row[key];
        });
      }
  
      var trace1 = {
        x: [-5.699620807, -5.650399316, -5.526565548, -6.368754051],
        y: [-6.659581961, -5.089488493, -4.378679438, -5.295157615],
        z: [-2.337235019, -2.206948738, -2.672845545, -1.849260083]
      };
  
      var trace2 = {
        x: [2.312929251, 0.935763568, 1.73830554, 2.450414159],
        y: [-2.441374062, -1.611848326, -2.146141648, -1.057849942],
        z: [2.999392024, 1.657828382, 3.753269578, 3.426547531]
      };
  
      var data = [
        {
          x: trace1.x,
          y: trace1.y,
          z: trace1.z,
          mode: "markers",
          type: "scatter3d",
          text: ['db_1','db_2','db_3','db_4'],
          hoverinfo: 'text',
          marker: {
            color: "red",
            size: 2
          }
        },
        {
          opacity: 0.5,
          type: "mesh3d",
          name: "Cluster 1",
          hoverinfo: 'name',
          color: "red",
          x: trace1.x,
          y: trace1.y,
          z: trace1.z
        },
        {
          x: trace2.x,
          y: trace2.y,
          z: trace2.z,
          mode: "markers",
          type: "scatter3d",
          text: ['db_5','db_6','db_7','db_8'],
          hoverinfo: 'text',
          marker: {
            color: "purple",
            size: 2
          }
        },
        {
          opacity: 0.5,
          type: "mesh3d",
          name: "Cluster 2",
          hoverinfo: 'name',
          color: "purple",
          x: trace2.x,
          y: trace2.y,
          z: trace2.z
        }
      ];
      var layout = {
        autosize: true,
        // hovermode:'closest',
        height: 210,
        scene: {
          aspectratio: {
            x: 1,
            y: 1,
            z: 1
          },
          camera: {
            center: {
              x: 0,
              y: 0,
              z: 0
            },
            eye: {
              x: 1.25,
              y: 1.25,
              z: 1.25
            },
            up: {
              x: 0,
              y: 0,
              z: 1
            }
          },
          xaxis: {
            type: "linear",
            zeroline: false
          },
          yaxis: {
            type: "linear",
            zeroline: false
          },
          zaxis: {
            type: "linear",
            zeroline: false
          }
        },
        showlegend: false,
        width: 255
      };
  
      Plotly.newPlot("myDiv", data, layout, {
        displaylogo: false,
        fillFrame: true,
        modeBarButtonsToRemove: [
          "sendDataToCloud",
          "toImage",
          "zoom3d",
          "resetCameraLastSave3d"
        ]
      });
      var myScene = $("#myDiv #scene");
      myScene.width(255);
      myScene.height(210 - 20);
      myScene.css("left", 0);
      myScene.css("top", 20);
      $('#myDiv [data-attr="scene.dragmode"]').each((i, d) => {
        $(d).click(() => {
          myScene.width(255);
          myScene.height(210 - 20);
          myScene.css("left", 0);
          myScene.css("top", 20);
        });
      });
      var myPlot = document.getElementById('myDiv')
      myPlot.on('plotly_click', function(data){
        // plot the 'hover' trace as a permanent/colored trace on click
          console.log(data.points[0].data.type);
      });
    }
  );
  