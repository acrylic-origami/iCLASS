# iCLASS #

Intracranial EEG Clinical Labeling Assistant.

A key issue with the application of machine learning to neurological disorders is the human error and subjectivity involved in annotating physiological recordings. iCLASS aims to streamline the process of viewing and annotating iEEG data.

## Data ##

## Annotations ##

There are three main componenents that handle annotations in iCLASS: `AnnotationPopUp`, `AnnotationList` and `D3Controller`. 

There is a single `annotations` array in the `MainController` state that is passed to both `AnnotationList` and `D3Controller`.

### AnnotationPopUp ###

The `AnnotationPopUp` is simply a form for *adding and editing annotations* that can be positioned at any location in an overlay over the screen. The pop up parameters can be set in the MainController to have it either add a new annotation or edit an existing. It is triggered to add a new annotation via a double click on the main SVG through the D3 controller. It is triggered to edit an existing annotation when an annotation is double clicked in the annotation list.

### AnnotationList ###

The annotation list simply creates a list of all the annotations as they are ordered in the annotations list that is passed in through the props. It displays the critical information such as time, type and notes. When an annotation is double clicked, it opens the AnnotationPopUp. 

### D3Controller ###

The D3 controller receives the annotation list and transforms them into editable D3 brushes that are then displayed and can be edited when the the `is_editable` state is true in `MainController`. If there is a change in the annotation list when `OnComponentDidUpdate` fires, `this.annotationsToBrushes` is called and passed the new list of annotations. 

`this.annotationsToBrushes` first clears any existing brushes. It then converts the list of annotations to a an array that can be transformed into brushes. It mainly looks for onset/offset pairs that translate into a seizure. Each brush in the array has a type, either point or range that are displayed differently. Each brush is then passed into `this.newBrush`. 

`this.newBrush` creates the d3 brushes based on their type and start/end times. For more information on d3 brushes, please read https://github.com/d3/d3-brush. The d3 brush objects are added to an array with the corresponding data so that they can be accessed an manipulated anywhere inside the `D3Controller`. 

- `onBrushEnd()` is called after a brush has been edited. It calculates the new start and end time of the brush, finds the corresponding annotation and calls the `updateAnnotation` passed in props to update the `MainController` state.

`this.updateBrushes` uses the data in the local brushes array as well as the d3 axis object to calculate new positions for the brushes. It then calls `move` on the brushes to move them to the correct location. This can be called any time the axis change, ie zoom or pan. 

`this.clearBrushes` simply clears all the brushes. 


