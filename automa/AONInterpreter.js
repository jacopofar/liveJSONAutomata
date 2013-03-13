/*
 * Distributed under the BSD license:
 *
 * Copyright (c) 2013, Jacopo Farina
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the following disclaimer
 *   in the documentation and/or other materials provided with the
 *   distribution.
 * * Neither the name of the  nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */

function AONexecute(code,automata,consoleselector){
	try{
		var parsed=JSON.parse(code);
	}
	catch (errobj){
			$(consoleselector).text("PARSING ERROR: "+errobj);
			return;
		}
	automata.description=code;
	//CELLS
	if(parsed.cells){
		var cells=parsed.cells;
		//cells that will receive a status
		for (var i = 0; i < cells.length; i++) {
			//if there's a timerange and is not satisfied, skip this
			if(cells[i].timerange){
				if(cells[i].timerange[0]>automata.steps || cells[i].timerange[1]<automata.steps)
					continue;
			}
			//the timerange, if present, is satisfied, so let's update the status
			automata.setCellStatus(cells[i].x,cells[i].y,cells[i].status);
		}
	}
	
	//PALETTE
	if(parsed.palette){
		var palette=parsed.palette;
		for (var i = 0; i < palette.length; i++) {
			//if there's a timerange and is not satisfied, skip this
			if(palette[i].timerange){
				if(palette[i].timerange[0]>automata.steps || palette[i].timerange[1]<automata.steps)
					continue;
			}
			//the timerange, if present, is satisfied, so let's update the palette
			automata.setPalette(palette[i].status,palette[i].color);
		}
	}
	
	//RULES
	if(parsed.rules){
		var rules=parsed.rules;
		for (var i = 0; i < rules.length; i++) {
			//rules timerange is checked by the automata, here we add them in any case
			automata.setRule(rules[i]);
		}
	}
}
/*
 * A cellular automata is represented as a sparse matrix, where each cell has a string status.
 * The status of an undefined cell is "default".
 * At each step, it checks also default cells at a certain distance from a non-default one
 * that distance is decided from rules: the maximum distance used by a rule bond is used to check default cells
 * NOTE: a cell
 * 
 * */
function Automata(w,h){
	//alert("sono un Automa, sto venendo instanziato!");
	this.cells={};
	this.rules={};
	this.steps=0;
	this.description="dunno";
	this.palette={};
	this.lastChanged=0;
	this.lastTestedRules=0;
	this.height=h;
	this.width=w;
	this.log=function(message){
		$('#console').append(message+"<br />");
	}
	this.getCellStatus=function(x,y){
		x=x%this.width;
		y=y%this.height;
		return this.cells[[x,y]];
	};
	
	this.setCellStatus=function(x,y,status){
		this.cells[[x%this.width,y%this.height]]=status;
	};
	
	this.getColor=function(status){
		return this.palette[status];
	};
	
	this.step=function(){
		this.log("step number "+this.steps+", cells: "+JSON.stringify(this.cells));
		this.steps++;
		/*
		 a rule is an object like this:
		 * 
		 * {"ID":"rule A",
		 * "timerange":[1,23],
		 * "applyTo":"alive",
		 * "neighbours":[{"rpos":[-1,1],"status":"alive"},{"rpos":[1,1],"status":"alive"}],
		 * "newStatus":"default"
		 * }
		 * 
		let's iterate over rules, and update the matching statuses
		for each rule, we check, in turn:
		* 1 - the timerange, it it's expired skip it
		* 2 - the cell status, so we can iterate over cells with that status
		* 3 - the neighbours, for each cell with that status
		* */
		//debugging variables
		this.lastChanged=0;
		this.lastTestedRules=0;
		//what is the maximum distance to check required by a rule? So we can use a sparse matrix generating the minimum number of 'default' cells
		var maxXdistance=1;
		var maxYdistance=1;
		for(var ir=0;ir<Object.keys(this.rules).length;ir++){
			var ID=Object.keys(this.rules)[ir];
			var rule=this.rules[ID];
			for(var inr=0;inr<rule.neighbours.length;inr++){
				var nbond=rule.neighbours[inr];
				if (Math.abs(nbond.rpos[0])>maxXdistance)maxXdistance=Math.abs(nbond.rpos[0]);
				if (Math.abs(nbond.rpos[1])>maxYdistance)maxYdistance=Math.abs(nbond.rpos[1]);
			}
		}
		//now maxXdistance and maxYdistance givce the amount of default cells to generate
		var increaseCells={};
		for(var cind=0;cind<Object.keys(this.cells).length;cind++){
			var cellCoord=Object.keys(this.cells)[cind].split(',');
			cellCoord[0]=parseInt(cellCoord[0], 10);
			cellCoord[1]=parseInt(cellCoord[1], 10);
			//we have the coordinates of a non-default cell
			//let's create the default cell sparse matrix
			for(var x=-maxXdistance;x<=maxXdistance;x++){
				for(var y=-maxYdistance;y<=maxYdistance;y++){
					increaseCells[[cellCoord[0]+x,cellCoord[1]+y]]='default';
				}
			}
		}
		//now increaseCells contains the default cells to be checked within the usual non-default cells
		//let's add to increaseCells the real cells
		for (var coord in this.cells) { increaseCells[coord]=this.cells[coord];}
		var updcoordx=[],updcoordy=[],upstatuses=[];
		//alert(JSON.stringify(this));
		//$.each(this.rules, function(ID, ruleraw) {
		for(var ir=0;ir<Object.keys(this.rules).length;ir++){
			var ID=Object.keys(this.rules)[ir];
			var rule=this.rules[ID];
			if(rule.timerange[0]>this.steps || rule.timerange[1]<this.steps)
				return;
			this.lastTestedRules++;
			//the timerange is valid, let's iterate over cells with the desired status
			var matchStatus=rule.applyTo;
			for(var cind=0;cind<Object.keys(increaseCells).length;cind++){
				var cellCoord=Object.keys(increaseCells)[cind].split(',');
				cellCoord[0]=parseInt(cellCoord[0], 10);
				cellCoord[1]=parseInt(cellCoord[1], 10);
				
				var status=increaseCells[cellCoord];
				if(!status)status='default';
				if(status!=matchStatus) continue;
				//timerange and status are valid, let's look at neighbours
				var applyThis=true;
				for(var inr=0;inr<rule.neighbours.length;inr++){
					var nbond=rule.neighbours[inr];
					if(!applyThis) continue;
					var nposx=cellCoord[0]+nbond.rpos[0];
					var nposy=cellCoord[1]+nbond.rpos[1];
					var neigh=this.getCellStatus(nposx,nposy);
					//if there's no status, it's "default"
					if(!neigh) neigh='default';
					if(neigh!=nbond.status)applyThis=false;
				}
					//if ApplyThis is still true, the rule has to be applied
				if(applyThis){
					this.log("status of "+cellCoord[0]+","+cellCoord[1]+" set to "+rule.newstatus+" as an effect of rule "+ID);
					//WE DO NOT CHANGE THE STATUS HERE, or it could affect other rules evaluation
					//we save it to an array and apply all updates at the end to avoid conflicts
					updcoordx.push(cellCoord[0]);
					updcoordy.push(cellCoord[1]);
					upstatuses.push(rule.newstatus);
					this.lastChanged++;
				}
			}
		}
		//update all cells
		for(var i=0;i<updcoordx.length;i++)
			this.setCellStatus(updcoordx[i],updcoordy[i],upstatuses[i]);
	};
	
	this.setPalette=function(status,color){
		this.palette[status]=color;
	};
	
	this.setRule=function(rule){
		//We want to append or overwrite the rule with the same ID
		this.rules[rule.ID]=rule;
	};
	
	this.canvasDump=function(canvas){
		var ctx=canvas.getContext('2d');
		var width=canvas.width;
		var height=canvas.height;
		//empty canvas region
		ctx.fillStyle = this.getColor('default');
		ctx.fillRect(0, 0, this.height, this.width);
		for(var x=0;x<width;x++){
			for(var y=0;y<height;y++){
				//alert("x: "+x+" y: "+y);
				if(this.getCellStatus(x,y)){
					ctx.fillStyle = this.getColor(this.getCellStatus(x,y));
					ctx.fillRect(x, y, 1, 1);
				}
			}
		}
		
	};
}
