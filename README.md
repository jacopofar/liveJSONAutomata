liveJSONAutomata
================

An HTML5 cellular automaton simulator able to change rules on the fly, made for March 2013 PLT Games "do it live"

A cellular automaton is a grid of cells where each cell has a *status* and there are some rules to change the status of a cell based on the statuses of neighbours and of the cell itself, in discrete time.
This script uses a cellular automaton description in a JSON object, and calculate it step after step.
Not only you can write rules in a glance using a simple JSON syntax, but you can change them __live__, that is, if you change a rule in the text area it will be applied to the current automaton, with the current cell statuses. You can both add rules and update already existing ones.

JSON syntax
-----------
The syntax is simple, see this example:

```json
{
"comment":"example automa, a Sierpinski triangle",
"cells":[
	{"x":300,"y":10,"status":"active cell","timerange":[12,2300]}
],
"palette":[
	{"status":"active cell","color":"rgb(250,10,10)","timerange":[1,2300]},
	{"status":"default","color":"white","timerange":[1,2300]}
],
"rules":[
{"ID":"left",
"timerange":[1,2300],
"applyTo":"default",
"neighbours":[{"rpos":[-1,-1],"status":"active cell"},{"rpos":[0,-1],"status":"default"},{"rpos":[1,-1],"status":"default"}],
"newstatus":"active cell"
},
{"ID":"right",
"timerange":[1,2300],
"applyTo":"default",
"neighbours":[{"rpos":[-1,-1],"status":"default"},{"rpos":[0,-1],"status":"default"},{"rpos":[1,-1],"status":"active cell"}],
"newstatus":"active cell"
}

]
}
```

At each step, the code will be evaluated and applied.


The `cell` key defines an array of cells with a status, in this case the status is `active cell` (you can use any character and whitespaces). Each cell has a timerange, in this case the cell will be created at step number `12` and removed at step number `2300`. Please note that the cell will not be changed when the line is not in the edit box. So, if you remove the line before the step 2300 the cell will stay there, and if you remove it before the step `12` it will never be created.

This value also override automaton evolution, so if some rule changes the status of the cell, it will not be changed (to be correct, it will be changed and then changed set at the next step). Is possible to define various states for the same cell in different times, the behavior in case of overlapping is not defined.

The `palette` key tells how to represent statuses with colors. The `default` state is the one applied when the call has no value. All cells are in default state if not defined otherwise by rules.

The `rules` key is the hearth of the toy: each rule has a string identifier called `ID`, a timerange as usual, an `applyTo` field defining to which cell status is applied and a `neighbours` array defining the neighbours statuses (with relative coordinates) that trigger the rules; __all__ the statuses has to match to trigger the rule.

A rule is applied until is overridden by another rule with the same ID or the `timerange` expires. Unlike `palette` and `cells`, __it remains active even when you remove it from the edit box__.

Turing completeness
-------------------
The automaton is Turing-complete. If we consider a row in the cell matrix as the strip of tape, cell statuses as Turing machine statuses and define rules changing a row based on the row above, we have a Turing machine where the N row represent the N step.

I would not use it for writing a database, thought.

License
-------
The code is released under BSD license, you can freely use, copy, study and modify it as defined in the note inside the script.

The JSON editor is based on ACE AJAX editor, see http://ace.ajax.org/ 

TODO
----
The program has a lot of improvements to be done:
* start/stop/pause button
* improve speed and memory usage
* testing on different browsers (not only Chrome)
* better code comments
