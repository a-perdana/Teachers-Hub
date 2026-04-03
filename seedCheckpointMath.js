/**
 * seedCheckpointMath.js
 * ─────────────────────────────────────────────────────────────────
 * Seeds checkpoint_math_pacing/year7-8 in Firestore.
 * Source: Cambridge Mathematics Content.csv rows 1–183
 *   - Coursebook 7  → Year 7 (rows 1–66)
 *   - Coursebook 8  → Year 7 (rows 67–96, same school year in CSV)
 *   - Coursebook 9  → Year 8 (rows 97–183)
 *
 * Prerequisites:
 *   1. npm install firebase-admin   (already done if seedFirestore.js ran)
 *   2. serviceAccountKey.json next to this file
 *
 * Usage:
 *   node seedCheckpointMath.js
 * ─────────────────────────────────────────────────────────────────
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Seed Data ─────────────────────────────────────────────────────
// Built from Cambridge Mathematics Content.csv
// Group=SMP, Qualification=Cambridge Lower Secondary
// Year 7 = Learner's Book 7 + Learner's Book 8
// Year 8 = Learner's Book 9

const RAW_DATA = [
  // ── YEAR 7 — Learner's Book 7 ──────────────────────────────────
  {
    chapter: "1. Integers",
    year: "Year 7",
    topics: [
      { topic: "1.1 Adding and subtracting integers", objective: "7Ni.01: Estimate add and subtract integers recognising generalisations.\n7Nf.07: Estimate add and subtract positive and negative numbers with the same or different number of decimal places.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Multiplying and dividing integers", objective: "7Ni.03: Estimate multiply and divide integers including where one integer is negative.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Lowest common multiples", objective: "7Ni.04: Understand lowest common multiple and highest common factor (numbers less than 100).", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Highest common factors", objective: "7Ni.04: Understand lowest common multiple and highest common factor (numbers less than 100).", week: null, hour: 2, status: "pending" },
      { topic: "1.5 Tests for divisibility", objective: "7Ni.05: Use knowledge of tests of divisibility to find factors of numbers greater than 100.", week: null, hour: 2, status: "pending" },
      { topic: "1.6 Square roots and cube roots", objective: "7Ni.06: Understand the relationship between squares and corresponding square roots and cubes and corresponding cube roots.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Expressions, formulae and equations",
    year: "Year 7",
    topics: [
      { topic: "2.1 Constructing Expressions", objective: "7Ae.01: Understand that letters can be used to represent unknown numbers variables or constants.\n7Ae.04: Understand that a situation can be represented either in words or as an algebraic expression and move between the two representations (linear with integer coefficients).", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Using expressions and formulae", objective: "7Ae.05: Understand that a situation can be represented either in words or as a formula (single operation) and move between the two representations.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Collecting like terms", objective: "7Ae.03: Understand how to manipulate algebraic expressions including: collecting like terms.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Expanding brackets", objective: "7Ae.03: Understand how to manipulate algebraic expressions including: applying the distributive law with a constant.", week: null, hour: 2, status: "pending" },
      { topic: "2.5 Constructing and solving equations", objective: "7Ae.06: Understand that a situation can be represented either in words or as an equation. Move between the two representations and solve the equation (integer coefficients unknown on one side).", week: null, hour: 3, status: "pending" },
      { topic: "2.6 Inequalities", objective: "7Ae.07: Understand that letters can represent an open interval (one term).", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Place value and rounding",
    year: "Year 7",
    topics: [
      { topic: "3.1 Multiplying and dividing by powers of 10", objective: "7Np.01: Use knowledge of place value to multiply and divide whole numbers and decimals by any positive power of 10.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Rounding", objective: "7Np.02: Round numbers to a given number of decimal places.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Decimals",
    year: "Year 7",
    topics: [
      { topic: "4.1 Ordering decimals", objective: "7Nf.06: Understand the relative size of quantities to compare and order decimals and fractions using the symbols =  > and <.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Adding and subtracting decimals", objective: "7Nf.07: Estimate add and subtract positive and negative numbers with the same or different number of decimal places.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Multiplying decimals", objective: "7Nf.08: Estimate multiply and divide decimals by whole numbers.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Dividing decimals", objective: "7Nf.08: Estimate multiply and divide decimals by whole numbers.", week: null, hour: 2, status: "pending" },
      { topic: "4.5 Making decimal calculations easier", objective: "7Nf.04: Use knowledge of common factors laws of arithmetic and order of operations to simplify calculations containing decimals or fractions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Angles and constructions",
    year: "Year 7",
    topics: [
      { topic: "5.1 A sum of 360°", objective: "7Gg.11: Derive the property that the sum of the angles in a quadrilateral is 360° and use this to calculate missing angles.\n7Gg.12: Know that the sum of the angles around a point is 360° and use this to calculate missing angles.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Intersecting lines", objective: "7Gg.13: Recognise the properties of angles on: parallel lines and transversals perpendicular lines intersecting lines.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Drawing lines and quadrilaterals", objective: "7Gg.14: Draw parallel and perpendicular lines and quadrilaterals.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "6. Collecting data",
    year: "Year 7",
    topics: [
      { topic: "6.1 Conducting an investigation", objective: "7Ss.01: Select and trial data collection and sampling methods to investigate predictions for a set of related statistical questions considering what data to collect (categorical discrete and continuous data).", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Taking a sample", objective: "7Ss.02: Understand the effect of sample size on data collection and analysis.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Fractions",
    year: "Year 7",
    topics: [
      { topic: "7.1 Ordering fractions", objective: "7Nf.06: Understand the relative size of quantities to compare and order decimals and fractions using the symbols =  > and <.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Adding mixed numbers", objective: "7Nf.02: Estimate and add mixed numbers and write the answer as a mixed number in its simplest form.", week: null, hour: 2, status: "pending" },
      { topic: "7.3 Multiplying fractions", objective: "7Nf.03: Estimate multiply and divide proper fractions.", week: null, hour: 2, status: "pending" },
      { topic: "7.4 Dividing fractions", objective: "7Nf.03: Estimate multiply and divide proper fractions.", week: null, hour: 2, status: "pending" },
      { topic: "7.5 Making fraction calculations easier", objective: "7Nf.04: Use knowledge of common factors laws of arithmetic and order of operations to simplify calculations containing decimals or fractions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Shapes and symmetry",
    year: "Year 7",
    topics: [
      { topic: "8.1 Identifying the symmetry of 2D shapes", objective: "7Gg.10: Identify reflective symmetry and order of rotational symmetry of 2D shapes and patterns.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 Circles and polygons", objective: "7Gg.01: Identify describe and sketch regular polygons including reference to sides angles and symmetrical properties.\n7Gg.03: Know the parts of a circle: centre radius diameter circumference chord tangent.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Recognising congruent shapes", objective: "7Gg.02: Understand that if two 2D shapes are congruent corresponding sides and angles are equal.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 3D shapes", objective: "7Gg.06: Identify and describe the combination of properties that determine a specific 3D shape.\n7Gg.08: Visualise and represent front side and top view of 3D shapes.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "9. Sequences and functions",
    year: "Year 7",
    topics: [
      { topic: "9.1 Generating sequences (1)", objective: "7As.01: Understand term-to-term rules and generate sequences from numerical and spatial patterns (linear and integers).", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Generating sequences (2)", objective: "7As.01: Understand term-to-term rules and generate sequences from numerical and spatial patterns (linear and integers).", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Using the nth term", objective: "7As.02: Understand and describe nth term rules algebraically (in the form n ± a a × n where a is a whole number).", week: null, hour: 2, status: "pending" },
      { topic: "9.4 Representing simple functions", objective: "7As.03: Understand that a function is a relationship where each input has a single output. Generate outputs from a given function and identify inputs from a given output by considering inverse operations (linear and integers).\n7As.04: Understand that a situation can be represented either in words or as a linear function in two variables (of the form y = x + c or y = mx) and move between the two representations.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "10. Percentages",
    year: "Year 7",
    topics: [
      { topic: "10.1 Fractions, decimals and percentages", objective: "7Nf.01: Recognise that fractions terminating decimals and percentages have equivalent values.", week: null, hour: 2, status: "pending" },
      { topic: "10.2 Percentages large and small", objective: "7Nf.05: Recognise percentages of shapes and whole numbers including percentages less than 1 or greater than 100.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "11. Graphs",
    year: "Year 7",
    topics: [
      { topic: "11.1 Functions", objective: "7As.03: Understand that a function is a relationship where each input has a single output. Generate outputs from a given function and identify inputs from a given output by considering inverse operations (linear and integers).\n7As.04: Understand that a situation can be represented either in words or as a linear function in two variables (of the form y = x + c or y = mx) and move between the two representations.", week: null, hour: 2, status: "pending" },
      { topic: "11.2 Graphs of functions", objective: "7As.05: Use knowledge of coordinate pairs to construct tables of values and plot the graphs of linear functions where y is given explicitly in terms of x (y = x + c or y = mx).", week: null, hour: 3, status: "pending" },
      { topic: "11.3 Lines parallel to the axes", objective: "7As.06: Recognise straight-line graphs parallel to the x- or y-axis.", week: null, hour: 2, status: "pending" },
      { topic: "11.4 Interpreting graphs", objective: "7As.07: Read and interpret graphs related to rates of change. Explain why they have a specific shape.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "12. Ratio and proportion",
    year: "Year 7",
    topics: [
      { topic: "12.1 Simplifying ratios", objective: "7Nf.10: Use knowledge of equivalence to simplify and compare ratios (same units).", week: null, hour: 2, status: "pending" },
      { topic: "12.2 Sharing in a ratio", objective: "7Nf.11: Understand how ratios are used to compare quantities to divide an amount into a given ratio with two parts.", week: null, hour: 2, status: "pending" },
      { topic: "12.3 Using direct proportion", objective: "7Nf.09: Understand and use the unitary method to solve problems involving ratio and direct proportion in a range of contexts.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "13. Probability",
    year: "Year 7",
    topics: [
      { topic: "13.1 The probability scale", objective: "7Sp.01: Use the language associated with probability and proportion to describe compare order and interpret the likelihood of outcomes.\n7Sp.02: Understand and explain that probabilities range from 0 to 1 and can be represented as proper fractions decimals and percentages.", week: null, hour: 2, status: "pending" },
      { topic: "13.2 Mutually exclusive outcomes", objective: "7Sp.03: Identify all the possible mutually exclusive outcomes of a single event and recognise when they are equally likely to happen.", week: null, hour: 2, status: "pending" },
      { topic: "13.3 Experimental probabilities", objective: "7Sp.05: Design and conduct chance experiments or simulations using small and large numbers of trials. Analyse the frequency of outcomes to calculate experimental probabilities.\n7Sp.04: Understand how to find the theoretical probabilities of equally likely outcomes.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "14. Position and transformation",
    year: "Year 7",
    topics: [
      { topic: "14.1 Maps and plans", objective: "7Gp.01: Use knowledge of scaling to interpret maps and plans.", week: null, hour: 2, status: "pending" },
      { topic: "14.2 The distance between two points", objective: "7Gp.02: Use knowledge of 2D shapes and coordinates to find the distance between two coordinates that have the same x or y coordinate (without the aid of a grid).", week: null, hour: 2, status: "pending" },
      { topic: "14.3 Translating 2D shapes", objective: "7Gp.03: Use knowledge of translation of 2D shapes to identify the corresponding points between the original and the translated image without the use of a grid.", week: null, hour: 2, status: "pending" },
      { topic: "14.4 Reflecting shapes", objective: "7Gp.04: Reflect 2D shapes on coordinate grids in a given mirror line (x- or y-axis) recognising that the image is congruent to the object after a reflection.", week: null, hour: 2, status: "pending" },
      { topic: "14.5 Rotating shapes", objective: "7Gp.05: Rotate shapes 90° and 180° around a centre of rotation recognising that the image is congruent to the object after a rotation.", week: null, hour: 2, status: "pending" },
      { topic: "14.6 Enlarging shapes", objective: "7Gp.06: Understand that the image is mathematically similar to the object after enlargement. Use positive integer scale factors to perform and identify enlargements.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "15. Shapes, area and volume",
    year: "Year 7",
    topics: [
      { topic: "15.1 Converting between units for area", objective: "7Gg.04: Understand the relationships and convert between metric units of area including hectares (ha) square metres (m²) square centimetres (cm²) and square millimetres (mm²).", week: null, hour: 2, status: "pending" },
      { topic: "15.2 Using hectares", objective: "7Gg.04: Understand the relationships and convert between metric units of area including hectares (ha) square metres (m²) square centimetres (cm²) and square millimetres (mm²).", week: null, hour: 2, status: "pending" },
      { topic: "15.3 The area of a triangle", objective: "7Gg.05: Derive and know the formula for the area of a triangle. Use the formula to calculate the area of triangles and compound shapes made from rectangles and triangles.", week: null, hour: 2, status: "pending" },
      { topic: "15.4 Calculating the volume of cubes and cuboids", objective: "7Gg.07: Derive and use a formula for the volume of a cube or cuboid. Use the formula to calculate the volume of compound shapes made from cuboids in cubic metres (m³) cubic centimetres (cm³) and cubic millimetres (mm³).", week: null, hour: 2, status: "pending" },
      { topic: "15.5 Calculating the surface area of cubes and cuboids", objective: "7Gg.09: Use knowledge of area and properties of cubes and cuboids to calculate their surface area.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "16. Interpreting results",
    year: "Year 7",
    topics: [
      { topic: "16.1 Two-way tables", objective: "7Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: tally charts frequency tables and two-way tables.", week: null, hour: 2, status: "pending" },
      { topic: "16.2 Dual and compound bar charts", objective: "7Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: dual and compound bar charts.", week: null, hour: 2, status: "pending" },
      { topic: "16.3 Pie charts and waffle diagrams", objective: "7Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: waffle diagrams and pie charts.", week: null, hour: 2, status: "pending" },
      { topic: "16.4 Infographics", objective: "7Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: infographics.", week: null, hour: 2, status: "pending" },
      { topic: "16.5 Representing data", objective: "7Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: Venn and Carroll diagrams tally charts frequency tables and two-way tables dual and compound bar charts waffle diagrams and pie charts frequency diagrams for continuous data line graphs.", week: null, hour: 2, status: "pending" },
      { topic: "16.6 Using statistics", objective: "7Ss.04: Use knowledge of mode median mean and range to describe and summarise large data sets. Choose and explain which one is the most appropriate for the context.\n7Ss.05: Interpret data identifying patterns within and between data sets to answer statistical questions. Discuss conclusions considering the sources of variation including sampling and check predictions.", week: null, hour: 3, status: "pending" },
    ],
  },

  // ── YEAR 7 continued — Learner's Book 8 (same school year) ───────
  {
    chapter: "1. Integers (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "1.1 Factors, multiples and primes", objective: "8Ni.03: Understand factors multiples prime factors highest common factors and lowest common multiples.", week: null, hour: 3, status: "pending" },
      { topic: "1.2 Multiplying and dividing integers", objective: "8Ni.02: Estimate multiply and divide integers recognising generalisations.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Square roots and cube roots", objective: "8Ni.06: Recognise squares of negative and positive numbers and corresponding square roots.\n8Ni.07: Recognise positive and negative cube numbers and the corresponding cube roots.", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Indices", objective: "8Ni.05: Use positive and zero indices and the index laws for multiplication and division.\n8Ni.01: Understand that brackets indices (square and cube roots) and operations follow a particular order.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "2. Expressions, formulae and equations (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "2.1 Constructing expressions", objective: "8Ae.04: Understand that a situation can be represented either in words or as an algebraic expression and move between the two representations (linear with integer or fractional coefficients).", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Using expressions and formulae", objective: "8Ae.05: Understand that a situation can be represented either in words or as a formula (mixed operations) and manipulate using knowledge of inverse operations to change the subject of a formula.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Expanding brackets", objective: "8Ae.03: Understand how to manipulate algebraic expressions including: applying the distributive law with a single term (squares and cubes).", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Factorising", objective: "8Ae.03: Understand how to manipulate algebraic expressions including: identifying the highest common factor to factorise.", week: null, hour: 2, status: "pending" },
      { topic: "2.5 Constructing and solving equations", objective: "8Ae.06: Understand that a situation can be represented either in words or as an equation. Move between the two representations and solve the equation (integer or fractional coefficients unknown on either or both sides).", week: null, hour: 3, status: "pending" },
      { topic: "2.6 Inequalities", objective: "8Ae.07: Understand that letters can represent open and closed intervals (two terms).", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Place value and rounding (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "3.1 Multiplying and dividing by 0.1 and 0.01", objective: "8Np.01: Use knowledge of place value to multiply and divide integers and decimals by 0.1 and 0.01.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Rounding", objective: "8Np.02: Round numbers to a given number of significant figures.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Decimals (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "4.1 Ordering decimals", objective: "8Nf.06: Understand the relative size of quantities to compare and order decimals and fractions (positive and negative) using the symbols = > <.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Multiplying decimals", objective: "8Nf.07: Estimate and multiply decimals by integers and decimals.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Dividing by decimals", objective: "8Nf.08: Estimate and divide decimals by numbers with one decimal place.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Making decimal calculations easier", objective: "8Nf.04: Use knowledge of the laws of arithmetic and order of operations (including brackets) to simplify calculations containing decimals or fractions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Angles and constructions (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "5.1 Parallel lines", objective: "8Gg.11: Recognise and describe the properties of angles on parallel and intersecting lines using geometric vocabulary such as alternate corresponding and vertically opposite.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 The exterior angle of a triangle", objective: "8Gg.10: Derive and use the fact that the exterior angle of a triangle is equal to the sum of the two interior opposite angles.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Constructions", objective: "8Gg.12: Construct triangles midpoint and perpendicular bisector of a line segment and the bisector of an angle.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "6. Collecting data (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "6.1 Data collection", objective: "8Ss.01: Select trial and justify data collection and sampling methods to investigate predictions for a set of related statistical questions considering what data to collect (categorical discrete and continuous data).", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Sampling", objective: "8Ss.02: Understand the advantages and disadvantages of different sampling methods.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Fractions (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "7.1 Fractions and recurring decimals", objective: "8Nf.01: Recognise fractions that are equivalent to recurring decimals.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Ordering fractions", objective: "8Nf.06: Understand the relative size of quantities to compare and order decimals and fractions (positive and negative).", week: null, hour: 2, status: "pending" },
      { topic: "7.3 Subtracting mixed numbers", objective: "8Nf.02: Estimate and subtract mixed numbers and write the answer as a mixed number in its simplest form.", week: null, hour: 2, status: "pending" },
      { topic: "7.4 Multiplying an integer by a mixed number", objective: "8Nf.03: Estimate and multiply an integer by a mixed number and divide an integer by a proper fraction.", week: null, hour: 2, status: "pending" },
      { topic: "7.5 Dividing an integer by a fraction", objective: "8Nf.03: Estimate and multiply an integer by a mixed number and divide an integer by a proper fraction.", week: null, hour: 2, status: "pending" },
      { topic: "7.6 Making fraction calculations easier", objective: "8Nf.04: Use knowledge of the laws of arithmetic and order of operations (including brackets) to simplify calculations containing decimals or fractions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Shapes and symmetry (Book 8)",
    year: "Year 7",
    topics: [
      { topic: "8.1 Quadrilaterals and polygons", objective: "8Gg.01: Identify and describe the hierarchy of quadrilaterals.\n8Gg.09: Understand that the number of sides of a regular polygon is equal to the number of lines of symmetry and the order of rotation.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 The circumference of a circle", objective: "8Gg.02: Understand π as the ratio between a circumference and a diameter. Know and use the formula for the circumference of a circle.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 3D shapes", objective: "8Gg.05: Understand and use Euler's formula to connect number of vertices faces and edges of 3D shapes.\n8Gg.08: Use knowledge of area and properties of cubes cuboids triangular prisms and pyramids to calculate their surface area.", week: null, hour: 3, status: "pending" },
    ],
  },

  // ── YEAR 8 — Learner's Book 9 ──────────────────────────────────
  {
    chapter: "9. Sequences and functions",
    year: "Year 8",
    topics: [
      { topic: "9.1 Generating sequences", objective: "8As.01: Understand term-to-term rules and generate sequences from numerical and spatial patterns (including fractions).", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Finding rules for sequences", objective: "8As.02: Understand and describe nth term rules algebraically (in the form n ± a a × n or an ± b where a and b are positive or negative integers or fractions).", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Using the nth term", objective: "8As.02: Understand and describe nth term rules algebraically (in the form n ± a a × n or an ± b where a and b are positive or negative integers or fractions).", week: null, hour: 2, status: "pending" },
      { topic: "9.4 Representing simple functions", objective: "8As.03: Understand that a function is a relationship where each input has a single output. Generate outputs from a given function and identify inputs from a given output by considering inverse operations (including fractions).\n8As.04: Understand that a situation can be represented either in words or as a linear function in two variables (of the form y = mx + c) and move between the two representations.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "10. Percentages",
    year: "Year 8",
    topics: [
      { topic: "10.1 Percentage increases and decreases", objective: "8Nf.05: Understand percentage increase and decrease and absolute change.", week: null, hour: 2, status: "pending" },
      { topic: "10.2 Using a multiplier", objective: "8Nf.05: Understand percentage increase and decrease and absolute change.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "11. Graphs",
    year: "Year 8",
    topics: [
      { topic: "11.1 Functions", objective: "8As.03: Understand that a function is a relationship where each input has a single output. Generate outputs from a given function and identify inputs from a given output by considering inverse operations (including fractions).\n8As.04: Understand that a situation can be represented either in words or as a linear function in two variables (of the form y = mx + c) and move between the two representations.", week: null, hour: 2, status: "pending" },
      { topic: "11.2 Plotting graphs", objective: "8As.05: Use knowledge of coordinate pairs to construct tables of values and plot the graphs of linear functions where y is given explicitly in terms of x (y = mx + c).", week: null, hour: 3, status: "pending" },
      { topic: "11.3 Gradient and intercept", objective: "8As.06: Recognise that equations of the form y = mx + c correspond to straight-line graphs where m is the gradient and c is the y-intercept (integer values of m).", week: null, hour: 2, status: "pending" },
      { topic: "11.4 Interpreting graphs", objective: "8As.07: Read and interpret graphs with more than one component. Explain why they have a specific shape and the significance of intersections of the graphs.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "12. Ratio and proportion",
    year: "Year 8",
    topics: [
      { topic: "12.1 Simplifying ratios", objective: "8Nf.10: Use knowledge of equivalence to simplify and compare ratios (different units).", week: null, hour: 2, status: "pending" },
      { topic: "12.2 Sharing in a ratio", objective: "8Nf.11: Understand how ratios are used to compare quantities to divide an amount into a given ratio with two or more parts.", week: null, hour: 2, status: "pending" },
      { topic: "12.3 Ratio and direct proportion", objective: "8Nf.09: Understand and use the relationship between ratio and direct proportion.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "13. Probability",
    year: "Year 8",
    topics: [
      { topic: "13.1 Calculating probabilities", objective: "8Sp.03: Understand how to find the theoretical probabilities of equally likely combined events.\n8Sp.02: Understand that tables diagrams and lists can be used to identify all mutually exclusive outcomes of combined events (independent events only).", week: null, hour: 3, status: "pending" },
      { topic: "13.2 Experimental and theoretical probabilities", objective: "8Sp.04: Design and conduct chance experiments or simulations using small and large numbers of trials. Compare the experimental probabilities with theoretical outcomes.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "14. Position and transformation",
    year: "Year 8",
    topics: [
      { topic: "14.1 Bearings", objective: "8Gp.01: Understand and use bearings as a measure of direction.", week: null, hour: 2, status: "pending" },
      { topic: "14.2 The midpoint of a line segment", objective: "8Gp.02: Use knowledge of coordinates to find the midpoint of a line segment.", week: null, hour: 2, status: "pending" },
      { topic: "14.3 Translating 2D shapes", objective: "8Gp.03: Translate points and 2D shapes using vectors recognising that the image is congruent to the object after a translation.", week: null, hour: 2, status: "pending" },
      { topic: "14.4 Reflecting shapes", objective: "8Gp.04: Reflect 2D shapes and points in a given mirror line on or parallel to the x- or y-axis or y = ±x on coordinate grids. Identify a reflection and its mirror line.", week: null, hour: 2, status: "pending" },
      { topic: "14.5 Rotating shapes", objective: "8Gp.05: Understand that the centre of rotation direction of rotation and angle are needed to identify and perform rotations.", week: null, hour: 2, status: "pending" },
      { topic: "14.6 Enlarging shapes", objective: "8Gp.06: Enlarge 2D shapes from a centre of enlargement (outside or on the shape) with a positive integer scale factor. Identify an enlargement and scale factor.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "15. Distance, area and volume",
    year: "Year 8",
    topics: [
      { topic: "15.1 Converting between miles and kilometres", objective: "8Gg.03: Know that distances can be measured in miles or kilometres and that a kilometre is approximately 5/8 of a mile or a mile is 1.6 kilometres.", week: null, hour: 2, status: "pending" },
      { topic: "15.2 The area of a parallelogram and trapezium", objective: "8Gg.04: Use knowledge of rectangles squares and triangles to derive the formulae for the area of parallelograms and trapezia. Use the formulae to calculate the area of parallelograms and trapezia.", week: null, hour: 2, status: "pending" },
      { topic: "15.3 Calculating the volume of triangular prisms", objective: "8Gg.06: Use knowledge of area and volume to derive the formula for the volume of a triangular prism. Use the formula to calculate the volume of triangular prisms.", week: null, hour: 2, status: "pending" },
      { topic: "15.4 Calculating the surface area of triangular prisms and pyramids", objective: "8Gg.08: Use knowledge of area and properties of cubes cuboids triangular prisms and pyramids to calculate their surface area.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "16. Interpreting and discussing results",
    year: "Year 8",
    topics: [
      { topic: "16.1 Interpreting and drawing frequency diagrams", objective: "8Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: frequency diagrams for continuous data.", week: null, hour: 2, status: "pending" },
      { topic: "16.2 Time series graphs", objective: "8Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: line graphs and time series graphs.", week: null, hour: 2, status: "pending" },
      { topic: "16.3 Stem-and-leaf diagram", objective: "8Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: stem-and-leaf diagrams.", week: null, hour: 2, status: "pending" },
      { topic: "16.4 Pie charts", objective: "8Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: pie charts.", week: null, hour: 2, status: "pending" },
      { topic: "16.5 Representing data", objective: "8Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: Venn and Carroll diagrams; tally charts frequency tables and two-way tables; dual and compound bar charts; pie charts; frequency diagrams for continuous data; line graphs and time series graphs; scatter graphs; stem-and-leaf diagrams; infographics.\n8Ss.05: Interpret data identifying patterns trends and relationships within and between data sets to answer statistical questions.", week: null, hour: 2, status: "pending" },
      { topic: "16.6 Using statistics", objective: "8Ss.05: Interpret data identifying patterns trends and relationships within and between data sets to answer statistical questions. Discuss conclusions considering the sources of variation including sampling and check predictions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "1. Number and calculation",
    year: "Year 8",
    topics: [
      { topic: "1.1 Irrational numbers", objective: "9Ni.01: Understand the difference between rational and irrational numbers.\n9Ni.04: Use knowledge of square and cube roots to estimate surds.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Standard form", objective: "9Ni.03: Understand the standard form for representing large and small numbers.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Indices", objective: "9Ni.02: Use positive negative and zero indices and the index laws for multiplication and division.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Expressions and formulae",
    year: "Year 8",
    topics: [
      { topic: "2.1 Substituting into expressions", objective: "9Ae.01: Understand that the laws of arithmetic and order of operations apply to algebraic terms and expressions (four operations and integer powers).", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Constructing expressions", objective: "9Ae.03: Understand that a situation can be represented either in words or as an algebraic expression and move between the two representations (including squares cubes and roots).", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Expressions and indices", objective: "9Ae.02: Understand how to manipulate algebraic expressions including: expanding the product of two algebraic expressions; applying the laws of indices; simplifying algebraic fractions.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Expanding the product of two linear expressions", objective: "9Ae.02: Understand how to manipulate algebraic expressions including: expanding the product of two algebraic expressions.", week: null, hour: 2, status: "pending" },
      { topic: "2.5 Simplifying algebraic fractions", objective: "9Ae.02: Understand how to manipulate algebraic expressions including: simplifying algebraic fractions.", week: null, hour: 2, status: "pending" },
      { topic: "2.6 Deriving and using formulae", objective: "9Ae.04: Understand that a situation can be represented either in words or as a formula (including squares and cubes) and manipulate using knowledge of inverse operations to change the subject of a formula.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Decimals, percentages and rounding",
    year: "Year 8",
    topics: [
      { topic: "3.1 Multiplying and dividing by powers of 10", objective: "9Np.01: Multiply and divide integers and decimals by 10 to the power of any positive or negative number.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Multiplying and dividing decimals", objective: "9Nf.06: Estimate multiply and divide decimals by integers and decimals.", week: null, hour: 2, status: "pending" },
      { topic: "3.3 Understanding compound percentages", objective: "9Nf.05: Understand compound percentages.", week: null, hour: 2, status: "pending" },
      { topic: "3.4 Understanding upper and lower bounds", objective: "9Np.02: Understand that when a number is rounded there are upper and lower limits for the original number.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Equations and inequalities",
    year: "Year 8",
    topics: [
      { topic: "4.1 Constructing and solving equations", objective: "9Ae.05: Understand that a situation can be represented either in words or as an equation. Move between the two representations and solve the equation (including those with an unknown in the denominator).", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Simultaneous equations", objective: "9Ae.06: Understand that the solution of simultaneous linear equations: is the pair of values that satisfy both equations; can be found algebraically (eliminating one variable); can be found graphically (point of intersection).", week: null, hour: 3, status: "pending" },
      { topic: "4.3 Inequalities", objective: "9Ae.07: Understand that a situation can be represented either in words or as an inequality. Move between the two representations and solve linear inequalities.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Angles",
    year: "Year 8",
    topics: [
      { topic: "5.1 Calculating angles", objective: "9Gg.09: Use properties of angles parallel and intersecting lines triangles and quadrilaterals to calculate missing angles.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Interior angles of polygons", objective: "9Gg.07: Derive and use the formula for the sum of the interior angles of any polygon.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Exterior angles of polygons", objective: "9Gg.08: Know that the sum of the exterior angles of any polygon is 360°.", week: null, hour: 2, status: "pending" },
      { topic: "5.4 Constructions", objective: "9Gg.11: Construct 60° 45° and 30° angles and regular polygons.", week: null, hour: 2, status: "pending" },
      { topic: "5.5 Pythagoras theorem", objective: "9Gg.10: Know and use Pythagoras' theorem.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "6. Statistical investigations",
    year: "Year 8",
    topics: [
      { topic: "6.1 Data collection and sampling", objective: "9Ss.01: Select trial and justify data collection and sampling methods to investigate predictions for a set of related statistical questions considering what data to collect and the appropriateness of each type (qualitative or quantitative; categorical discrete or continuous).", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Bias", objective: "9Ss.02: Explain potential issues and sources of bias with data collection and sampling methods identifying further questions to ask.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Shapes and measurements",
    year: "Year 8",
    topics: [
      { topic: "7.1 Circumference and area of a circle", objective: "9Gg.01: Know and use the formulae for the area and circumference of a circle.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Areas of compound shapes", objective: "9Gg.03: Estimate and calculate areas of compound 2D shapes made from rectangles triangles and circles.", week: null, hour: 2, status: "pending" },
      { topic: "7.3 Large and small units", objective: "9Gg.02: Know and recognise very small or very large units of length capacity and mass.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Fractions",
    year: "Year 8",
    topics: [
      { topic: "8.1 Fractions and recurring decimals", objective: "9Nf.01: Deduce whether fractions will have recurring or terminating decimal equivalents.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 Fractions and the correct order of operations", objective: "9Nf.02: Estimate add and subtract proper and improper fractions and mixed numbers using the order of operations.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Multiplying fractions", objective: "9Nf.03: Estimate multiply and divide fractions interpret division as a multiplicative inverse and cancel common factors before multiplying or dividing.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 Dividing fractions", objective: "9Nf.03: Estimate multiply and divide fractions interpret division as a multiplicative inverse and cancel common factors before multiplying or dividing.", week: null, hour: 2, status: "pending" },
      { topic: "8.5 Making calculations easier", objective: "9Nf.04: Use knowledge of the laws of arithmetic inverse operations equivalence and order of operations (brackets and indices) to simplify calculations containing decimals and fractions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "9. Sequences and functions (Book 9)",
    year: "Year 8",
    topics: [
      { topic: "9.1 Generating sequences", objective: "9As.01: Generate linear and quadratic sequences from numerical patterns and from a given term-to-term rule (any indices).", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Using nth term", objective: "9As.02: Understand and describe nth term rules algebraically (in the form an ± b where a and b are positive or negative integers or fractions and in the form n/a n² n³ or n² ± a where a is a whole number).", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Representing functions", objective: "9As.04: Understand that a situation can be represented either in words or as a linear function in two variables (of the form y=mx+c or ax+by=c) and move between the two representations.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "10. Graphs",
    year: "Year 8",
    topics: [
      { topic: "10.1 Functions", objective: "9As.03: Understand that a function is a relationship where each input has a single output. Generate outputs from a given function and identify inputs from a given output by considering inverse operations (including indices).", week: null, hour: 2, status: "pending" },
      { topic: "10.2 Plotting graphs", objective: "9As.05: Use knowledge of coordinate pairs to construct tables of values and plot the graphs of linear functions including where y is given implicitly in terms of x (ax+by=c) and quadratic functions of the form y=x² ± a.", week: null, hour: 3, status: "pending" },
      { topic: "10.3 Gradient and intercept", objective: "9As.06: Understand that straight-line graphs can be represented by equations. Find the equation in the form y=mx+c or where y is given implicitly in terms of x (fractional positive and negative gradients).", week: null, hour: 2, status: "pending" },
      { topic: "10.4 Interpreting graphs", objective: "9As.07: Read draw and interpret graphs and use compound measures to compare graphs.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "11. Ratio and proportion",
    year: "Year 8",
    topics: [
      { topic: "11.1 Using ratios", objective: "9Nf.08: Use knowledge of ratios and equivalence for a range of contexts.", week: null, hour: 2, status: "pending" },
      { topic: "11.2 Direct and inverse proportion", objective: "9Nf.07: Understand the relationship between two quantities when they are in direct or inverse proportion.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "12. Probability",
    year: "Year 8",
    topics: [
      { topic: "12.1 Mutually exclusive events", objective: "9Sp.01: Understand that the probability of multiple mutually exclusive events can be found by summation and all mutually exclusive events have a total probability of 1.", week: null, hour: 2, status: "pending" },
      { topic: "12.2 Independent events", objective: "9Sp.02: Identify when successive and combined events are independent and when they are not.", week: null, hour: 2, status: "pending" },
      { topic: "12.3 Combined events", objective: "9Sp.03: Understand how to find the theoretical probabilities of combined events.", week: null, hour: 2, status: "pending" },
      { topic: "12.4 Chance experiments", objective: "9Sp.04: Design and conduct chance experiments or simulations using small and large numbers of trials. Calculate the expected frequency of occurrences and compare with observed outcomes.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "13. Position and transformation",
    year: "Year 8",
    topics: [
      { topic: "13.1 Bearings and scale drawings", objective: "9Gp.01: Use knowledge of bearings and scaling to interpret position on maps and plans.", week: null, hour: 2, status: "pending" },
      { topic: "13.2 Points on a line segment", objective: "9Gp.02: Use knowledge of coordinates to find points on a line segment.", week: null, hour: 2, status: "pending" },
      { topic: "13.3 Transformations", objective: "9Gp.03: Transform points and 2D shapes by combinations of reflections translations and rotations.\n9Gp.04: Identify and describe a transformation (reflections translations rotations and combinations of these).\n9Gp.05: Recognise and explain that after any combination of reflections translations and rotations the image is congruent to the object.", week: null, hour: 3, status: "pending" },
      { topic: "13.4 Enlarging shapes", objective: "9Gp.06: Enlarge 2D shapes from a centre of enlargement (outside on or inside the shape) with a positive integer scale factor.\n9Gp.07: Analyse and describe changes in perimeter and area of squares and rectangles when side lengths are enlarged by a positive integer scale factor.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "14. Volume, surface area and symmetry",
    year: "Year 8",
    topics: [
      { topic: "14.1 Calculating the volume of prisms", objective: "9Gg.04: Use knowledge of area and volume to derive the formula for the volume of prisms and cylinders. Use the formula to calculate the volume of prisms and cylinders.", week: null, hour: 2, status: "pending" },
      { topic: "14.2 Calculating the surface area of triangular prisms, pyramids and cylinders", objective: "9Gg.05: Use knowledge of area and properties of cubes cuboids triangular prisms.", week: null, hour: 2, status: "pending" },
      { topic: "14.3 Symmetry in three-dimensional shapes", objective: "9Gg.06: Identify reflective symmetry in 3D shapes.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "15. Interpreting and discussing results",
    year: "Year 8",
    topics: [
      { topic: "15.1 Interpreting and drawing frequency polygons", objective: "9Ss.03: Record organise and represent categorical discrete and continuous data. Choose and explain which representation to use in a given situation: Venn and Carroll diagrams; tally charts frequency tables and two-way tables; dual and compound bar charts; pie charts; line graphs time series graphs and frequency polygons; scatter graphs; stem-and-leaf and back-to-back stem-and-leaf diagrams; infographics.", week: null, hour: 2, status: "pending" },
      { topic: "15.2 Scatter graphs", objective: "9Ss.03: Record organise and represent categorical discrete and continuous data: scatter graphs.", week: null, hour: 2, status: "pending" },
      { topic: "15.3 Back-to-back stem-and-leaf diagrams", objective: "9Ss.03: Record organise and represent categorical discrete and continuous data: stem-and-leaf and back-to-back stem-and-leaf diagrams.", week: null, hour: 2, status: "pending" },
      { topic: "15.4 Calculating statistics for grouped data", objective: "9Ss.04: Use mode median mean and range to compare two distributions including grouped data.", week: null, hour: 2, status: "pending" },
      { topic: "15.5 Representing data", objective: "9Ss.05: Interpret data identifying patterns trends and relationships within and between data sets to answer statistical questions. Make informal inferences and generalisations identifying wrong or misleading information.", week: null, hour: 2, status: "pending" },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────
async function seed() {
  const docRef = db.collection("checkpoint_math_pacing").doc("year7-8");

  console.log("Seeding checkpoint_math_pacing/year7-8 …");
  await docRef.set({
    chapters: RAW_DATA,
    seededAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Done! ${RAW_DATA.length} chapters written.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
