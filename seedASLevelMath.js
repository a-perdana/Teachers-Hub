/**
 * seedASLevelMath.js
 * ─────────────────────────────────────────────────────────────────
 * Seeds asalevel_math_pacing/year11-12 in Firestore.
 * Source: Cambridge Mathematics Content.csv rows 286–549
 *   - Pure Mathematics 1     → Year 11 (rows 286–342)
 *   - Probability & Stats 1  → Year 11 (rows 343–371)
 *   - Pure Mathematics 2&3   → Year 12 (rows 372–429)
 *   - Mechanics              → Year 12 (rows 430–465)
 *   - Further Mathematics    → Year 12 (rows 466–549)
 *
 * Prerequisites:
 *   1. npm install firebase-admin
 *   2. serviceAccountKey.json next to this file
 *
 * Usage:
 *   node seedASLevelMath.js
 * ─────────────────────────────────────────────────────────────────
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Seed Data ─────────────────────────────────────────────────────

const RAW_DATA = [
  // ══════════════════════════════════════════════════════════════
  // YEAR 11 — Pure Mathematics 1
  // ══════════════════════════════════════════════════════════════
  {
    chapter: "1. Quadratics",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "1.1 Solving quadratic equations by factorisation", objective: "1.1.3: Solve quadratic equations and linear and quadratic inequalities in one unknown.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Completing the square", objective: "1.1.1: Carry out the process of completing the square for a quadratic polynomial ax² + bx + c and use this form to locate the vertex of the graph of y = ax² + bx + c.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 The quadratic formula", objective: "1.1.3: Solve quadratic equations and linear and quadratic inequalities in one unknown.", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Solving simultaneous equations (one linear and one quadratic)", objective: "1.1.4: Solve simultaneous equations in two unknowns with at least one linear equation.", week: null, hour: 2, status: "pending" },
      { topic: "1.5 Solving more complex quadratic equations", objective: "1.1.3: Solve quadratic equations and linear and quadratic inequalities in one unknown.", week: null, hour: 2, status: "pending" },
      { topic: "1.6 Maximum and minimum values of a quadratic function", objective: "1.1.1: Carry out the process of completing the square for a quadratic polynomial ax² + bx + c and use this form to locate the vertex of the graph of y = ax² + bx + c.", week: null, hour: 2, status: "pending" },
      { topic: "1.7 Solving quadratic inequalities", objective: "1.1.3: Solve quadratic equations and linear and quadratic inequalities in one unknown.", week: null, hour: 2, status: "pending" },
      { topic: "1.8 The number of roots of a quadratic equation", objective: "1.1.2: Find the discriminant of a quadratic polynomial ax² + bx + c and use the discriminant to determine the number of real roots of the equation ax² + bx + c = 0.", week: null, hour: 2, status: "pending" },
      { topic: "1.9 Intersection of a line and a quadratic curve", objective: "1.1.5: Find the set of values of k for which the line y = mx + k intersects does not intersect or is tangent to the graph of y = ax² + bx + c.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Functions",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "2.1 Definition of a function", objective: "1.2.1: Understand the terms function domain range one-one function inverse function and composition of functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Composite function", objective: "1.2.1: Understand the terms function domain range one-one function inverse function and composition of functions.\n1.2.2: Use the notation f(x) = , fg(x) = f(g(x)), f²(x) = f(f(x)) and understand the concept of the composition of two functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Inverse function", objective: "1.2.1: Understand the terms function domain range one-one function inverse function and composition of functions.\n1.2.3: Find the inverse of a one-one function and form composite functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 The graph of a function and its inverse", objective: "1.2.4: Understand the relationship between the graph of a function y = f(x) and its inverse y = f⁻¹(x).", week: null, hour: 2, status: "pending" },
      { topic: "2.5 Transformation of function", objective: "1.2.5: Understand the effect of the transformations of the graph y = f(x) represented by y = af(x), y = f(x) + a, y = f(x + a) and y = f(ax) and combinations of these transformations.", week: null, hour: 3, status: "pending" },
      { topic: "2.6 Reflection", objective: "1.2.5: Understand the effect of the transformations of the graph y = f(x) represented by y = af(x), y = f(x) + a, y = f(x + a) and y = f(ax).", week: null, hour: 2, status: "pending" },
      { topic: "2.7 Stretches", objective: "1.2.5: Understand the effect of the transformations of the graph y = f(x) represented by y = af(x) and y = f(ax).", week: null, hour: 2, status: "pending" },
      { topic: "2.8 Combined transformation", objective: "1.2.5: Understand combinations of transformations of the graph y = f(x).", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Coordinate geometry",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "3.1 Length of a line segment and midpoint", objective: "1.3.1: Find the length of a line segment and the coordinates of the midpoint of a line segment from the coordinates of its endpoints.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Parallel and perpendicular lines", objective: "1.3.2: Understand the relationship between the gradients of parallel and perpendicular lines.", week: null, hour: 2, status: "pending" },
      { topic: "3.3 Equations of straight lines", objective: "1.3.3: Find the equation of a straight line given sufficient information (e.g. the coordinates of two points on the line or one point on the line and its gradient).", week: null, hour: 2, status: "pending" },
      { topic: "3.4 The equation of a circle", objective: "1.3.4: Find the equation of a circle given sufficient information and understand the relationship between the equation of a circle and its geometrical properties.", week: null, hour: 2, status: "pending" },
      { topic: "3.5 Problems involving intersections of lines and circles", objective: "1.3.5: Find the coordinates of the points of intersection of a straight line with a circle and determine whether a given line intersects a given circle.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Circular measure",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "4.1 Radians", objective: "1.4.1: Understand the definition of a radian convert angles between degrees and radians and use radians to solve problems involving arc length and sector area.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Length of an arc", objective: "1.4.1: Use radians to solve problems involving arc length.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Area of a sector", objective: "1.4.1: Use radians to solve problems involving sector area.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Trigonometry",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "5.1 Angles between 0 and 90", objective: "1.5.1: Understand the definitions of sine cosine and tangent and their values for angles between 0° and 90°.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 The general definition of an angle", objective: "1.5.2: Extend the definitions of sine cosine and tangent to angles between 0° and 360° and understand the signs of trigonometric ratios in different quadrants.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Trigonometric ratios of general angles", objective: "1.5.2: Extend the definitions of sine cosine and tangent to angles between 0° and 360°.", week: null, hour: 2, status: "pending" },
      { topic: "5.4 Graphs of trigonometric functions", objective: "1.5.3: Sketch and recognise the graphs of the functions y = sin x, y = cos x, y = tan x, y = a sin(bx) + c, y = a cos(bx) + c and y = a tan(bx) and understand the terms period and amplitude.", week: null, hour: 3, status: "pending" },
      { topic: "5.5 Inverse trigonometric function", objective: "1.5.4: Understand the definitions and domains of the inverse trigonometric functions sin⁻¹ x, cos⁻¹ x and tan⁻¹ x.", week: null, hour: 2, status: "pending" },
      { topic: "5.6 Trigonometric equations", objective: "1.5.5: Solve trigonometric equations including those involving the use of trigonometric identities in a given interval.", week: null, hour: 3, status: "pending" },
      { topic: "5.7 Trigonometric identities", objective: "1.5.6: Prove and use the identities sin² θ + cos² θ = 1, sec² θ = 1 + tan² θ, cosec² θ = 1 + cot² θ and other related identities.", week: null, hour: 3, status: "pending" },
      { topic: "5.8 Further trigonometric equations", objective: "1.5.5: Solve trigonometric equations including those involving the use of trigonometric identities in a given interval.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "6. Series",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "6.1 Binomial expansion of (a+b)^n", objective: "1.6.1: Understand the binomial theorem for positive integer n and use it to expand expressions of the form (a + b)ⁿ.", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Binomial coefficients", objective: "1.6.1: Understand the binomial theorem for positive integer n and use it to expand expressions of the form (a + b)ⁿ.", week: null, hour: 2, status: "pending" },
      { topic: "6.3 Arithmetic progressions", objective: "1.6.2: Understand the concept of an arithmetic progression find the sum of a finite arithmetic progression and solve related problems.", week: null, hour: 2, status: "pending" },
      { topic: "6.4 Geometric progressions", objective: "1.6.3: Understand the concept of a geometric progression find the sum of a finite geometric progression and solve related problems.", week: null, hour: 2, status: "pending" },
      { topic: "6.5 Infinite geometric series", objective: "1.6.4: Find the sum to infinity of a convergent geometric progression and solve related problems.", week: null, hour: 2, status: "pending" },
      { topic: "6.6 Further arithmetic and geometric series", objective: "1.6.2: Find the sum of a finite arithmetic progression and solve related problems.\n1.6.3: Find the sum of a finite geometric progression and solve related problems.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Differentiation",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "7.1 Derivatives and gradient functions", objective: "1.7.1: Understand the concept of the derivative as a rate of change and as the gradient of a curve and find the gradient function of a function.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 The chain rule", objective: "1.7.2: Use the chain rule to find the derivative of composite functions.", week: null, hour: 2, status: "pending" },
      { topic: "7.3 Tangents and normals", objective: "1.7.3: Find the equations of tangents and normals to curves at given points.", week: null, hour: 2, status: "pending" },
      { topic: "7.4 Second derivatives", objective: "1.7.4: Find and use second derivatives including to determine the nature of stationary points.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Further differentiation",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "8.1 Increasing and decreasing function", objective: "1.7.5: Use the first derivative to determine whether a function is increasing or decreasing.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 Stationary points", objective: "1.7.4: Find and use second derivatives including to determine the nature of stationary points.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Practical maximum and minimum problems", objective: "1.7.6: Solve practical problems involving optimisation using differentiation.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 Rates of change", objective: "1.7.7: Solve problems involving rates of change including related rates.", week: null, hour: 2, status: "pending" },
      { topic: "8.5 Practical applications of connected rates of change", objective: "1.7.7: Solve problems involving rates of change including related rates.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "9. Integration",
    year: "Year 11",
    coursebook: "Pure Mathematics 1",
    topics: [
      { topic: "9.1 Integration as the reverse of differentiation", objective: "1.8.1: Understand integration as the reverse of differentiation and find indefinite integrals of simple functions.", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Finding the constant of integration", objective: "1.8.1: Understand integration as the reverse of differentiation and find indefinite integrals of simple functions.", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Integration of expressions of the form (ax+b)^n", objective: "1.8.2: Integrate expressions of the form (ax + b)ⁿ and functions that can be reduced to this form.", week: null, hour: 2, status: "pending" },
      { topic: "9.4 Further indefinite integration", objective: "1.8.2: Integrate expressions of the form (ax + b)ⁿ and functions that can be reduced to this form.", week: null, hour: 2, status: "pending" },
      { topic: "9.5 Definite integration", objective: "1.8.3: Evaluate definite integrals and understand the relationship between definite integrals and areas.", week: null, hour: 2, status: "pending" },
      { topic: "9.6 Area under a curve", objective: "1.8.3: Evaluate definite integrals and understand the relationship between definite integrals and areas.", week: null, hour: 2, status: "pending" },
      { topic: "9.7 Area bounded by a curve and a line or by two curves", objective: "1.8.4: Find the area between a curve and a straight line or between two curves using integration.", week: null, hour: 2, status: "pending" },
      { topic: "9.8 Improper integral", objective: "1.8.4: Find the area between a curve and a straight line or between two curves using integration.", week: null, hour: 2, status: "pending" },
      { topic: "9.9 Volumes of revolution", objective: "1.8.5: Find volumes of solids of revolution using integration.", week: null, hour: 2, status: "pending" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // YEAR 11 — Probability & Statistics 1
  // ══════════════════════════════════════════════════════════════
  {
    chapter: "1. Representation of data",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "1.1 Types of data", objective: "5.1.1: Select a suitable way of presenting raw statistical data and discuss advantages and/or disadvantages that particular representations may have.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Stem-and-leaf diagrams", objective: "5.1.2: Construct and interpret stem-and-leaf diagrams.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Histograms", objective: "5.1.3: Construct and interpret histograms (including unequal width).", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Cumulative frequency graphs", objective: "5.1.4: Construct and interpret cumulative frequency graphs.", week: null, hour: 2, status: "pending" },
      { topic: "1.5 Comparing different data representations", objective: "5.1.1: Select a suitable way of presenting raw statistical data and discuss advantages and/or disadvantages.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Measures of central tendency",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "2.1 The mode and the modal class", objective: "5.1.5: Estimate and interpret the mode (including modal class) of a set of data.", week: null, hour: 2, status: "pending" },
      { topic: "2.2 The mean", objective: "5.1.5: Estimate and interpret the mean of a set of data.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 The median", objective: "5.1.5: Estimate and interpret the median of a set of data.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Measures of variation",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "3.1 The range", objective: "5.1.6: Calculate and interpret measures of spread including the range.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 The interquartile range and percentiles", objective: "5.1.6: Calculate and interpret measures of spread including the interquartile range and percentiles.", week: null, hour: 2, status: "pending" },
      { topic: "3.3 Variance and standard deviation", objective: "5.1.6: Calculate and interpret measures of spread including variance and standard deviation.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Probability",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "4.1 Experiments, events and outcomes", objective: "5.3.1: Use appropriate terminology and notation associated with probability including experiment outcome event sample space complementary union and intersection.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Mutually exclusive events and the addition law", objective: "5.3.2: Understand mutually exclusive events and use the addition law for the probability of the union of mutually exclusive events.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Independent events and the multiplication law", objective: "5.3.3: Understand independent events and use the multiplication law for the probability of the intersection of independent events.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Conditional probability", objective: "5.3.4: Understand and use the conditional probability formula P(A|B) = P(A ∩ B) / P(B) including use of tree diagrams Venn diagrams and two-way tables.", week: null, hour: 2, status: "pending" },
      { topic: "4.5 Dependent events and conditional probability", objective: "5.3.4: Understand and use the conditional probability formula including use of tree diagrams Venn diagrams and two-way tables for dependent events.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Permutations and combinations",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "5.1 The factorial function", objective: "5.2.1: Understand and use the notation n! (factorial) including evaluating numerical expressions.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Permutations", objective: "5.2.2: Understand and use permutations in simple cases including evaluating numerical expressions.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Combinations", objective: "5.2.3: Understand and use combinations in simple cases including evaluating numerical expressions and use the relationship between combinations and binomial coefficients.", week: null, hour: 2, status: "pending" },
      { topic: "5.4 Problem solving with permutations and combinations", objective: "5.2.4: Solve problems using permutations and combinations including problems involving selections and arrangements.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "6. Probability distributions",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "6.1 Discrete random variables", objective: "5.4.1: Understand the concept of a discrete random variable and construct a probability distribution table.", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Probability distributions", objective: "5.4.1: Understand the concept of a discrete random variable and construct a probability distribution table.", week: null, hour: 2, status: "pending" },
      { topic: "6.3 Expectation and variance of a discrete random variable", objective: "5.4.2: Calculate and use the expectation and variance of a discrete random variable.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. The binomial and geometric distributions",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "7.1 The binomial distribution", objective: "5.4.3: Understand and use the binomial distribution including calculating probabilities and finding expectation and variance.", week: null, hour: 3, status: "pending" },
      { topic: "7.2 The geometric distribution", objective: "5.4.4: Understand and use the geometric distribution including calculating probabilities and finding expectation.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "8. The normal distribution",
    year: "Year 11",
    coursebook: "Probability & Statistics 1",
    topics: [
      { topic: "8.1 Continuous random variables", objective: "5.5.1: Understand the concept of a continuous random variable and the associated probability density function.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 The normal distribution", objective: "5.5.2: Understand and use the normal distribution including finding probabilities using tables of the normal distribution function.", week: null, hour: 3, status: "pending" },
      { topic: "8.3 Modelling with the normal distribution", objective: "5.5.3: Use the normal distribution as a model including standardising to the standard normal distribution and solving associated problems.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 The normal approximation to the binomial distribution", objective: "5.5.4: Use the normal distribution as an approximation to the binomial distribution where appropriate including the use of a continuity correction.", week: null, hour: 2, status: "pending" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // YEAR 12 — Pure Mathematics 2 & 3
  // ══════════════════════════════════════════════════════════════
  {
    chapter: "1. Algebra",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "1.1 The modulus function", objective: "2.1.1: Understand the meaning of |x|, sketch the graph of y = |ax + b| and use relations such as |a − b| = |b − a| and |x − a| < b ↔ a − b < x < a + b when solving equations and inequalities.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Graph of y = |f(x)| where f(x) is linear", objective: "2.1.1: Understand the meaning of |x| and sketch the graph of y = |ax + b|.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Solving modulus inequalities", objective: "2.1.1: Use relations to solve equations and inequalities involving the modulus function.", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Division of polynomial", objective: "2.1.2: Divide a polynomial of degree not exceeding 4 by a linear or quadratic polynomial and identify the quotient and remainder.\n3.1.2: Divide a polynomial of degree not exceeding 4 by a linear or quadratic polynomial and identify the quotient and remainder.", week: null, hour: 2, status: "pending" },
      { topic: "1.5 The factor theorem", objective: "2.1.3: Use the factor theorem to factorise a polynomial of degree not exceeding 4.\n3.1.3: Use the factor theorem to factorise a polynomial of degree not exceeding 4.", week: null, hour: 2, status: "pending" },
      { topic: "1.6 The remainder theorem", objective: "2.1.4: Use the remainder theorem to find the remainder when a polynomial of degree not exceeding 4 is divided by a linear polynomial.\n3.1.4: Use the remainder theorem to find the remainder when a polynomial of degree not exceeding 4 is divided by a linear polynomial.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Logarithmic and exponential functions",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "2.1 Logarithms to base 10", objective: "2.2.1: Understand the relationship between logarithms and exponentials and use the laws of logarithms (excluding change of base).", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Logarithms to base a", objective: "2.2.1: Understand the relationship between logarithms and exponentials and use the laws of logarithms.\n3.2.1: Use the laws of logarithms including change of base.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 The laws of logarithms", objective: "2.2.1: Understand and use the laws of logarithms.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Solving logarithmic equations", objective: "2.2.2: Solve equations of the form aˣ = b.\n3.2.2: Solve equations involving exponential and logarithmic expressions including those requiring change of base.", week: null, hour: 2, status: "pending" },
      { topic: "2.5 Solving exponential equations", objective: "2.2.2: Solve equations of the form aˣ = b.\n3.2.2: Solve equations involving exponential and logarithmic expressions.", week: null, hour: 2, status: "pending" },
      { topic: "2.6 Solving exponential inequalities", objective: "Solve inequalities involving exponential expressions.", week: null, hour: 2, status: "pending" },
      { topic: "2.7 Natural logarithms", objective: "2.2.1: Understand and use natural logarithms.\n3.2.1: Understand and use natural logarithms including change of base.", week: null, hour: 2, status: "pending" },
      { topic: "2.8 Transforming a relationship to a linear form", objective: "2.2.3: Transform a relationship to linear form to determine constants e.g. y = kxⁿ to lg y = lg k + n lg x or y = k aˣ to lg y = lg k + x lg a.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Trigonometry",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "3.1 The cosecant, secant and cotangent ratios", objective: "2.3.1: Understand and use the definitions of cosecant secant and cotangent and their relationships to sine cosine and tangent.\n3.3.1: Understand and use the definitions of cosecant secant and cotangent.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Compound angle formulae", objective: "2.3.2: Use the compound angle formulae.\n3.3.2: Use the compound angle formulae for sine cosine and tangent.", week: null, hour: 2, status: "pending" },
      { topic: "3.3 Double angle formulae", objective: "2.3.3: Use the double angle formulae.\n3.3.3: Use the double angle formulae for sine cosine and tangent.", week: null, hour: 2, status: "pending" },
      { topic: "3.4 Further trigonometric identities", objective: "2.3.4: Prove and use further trigonometric identities including those involving cosecant secant and cotangent.\n3.3.4: Prove and use trigonometric identities including those involving sums and differences of angles.", week: null, hour: 2, status: "pending" },
      { topic: "3.5 Expressing a sin θ + b cos θ in the form R sin(θ ± α) or R cos(θ ± α)", objective: "2.3.5: Express a sin θ + b cos θ in the form R sin(θ ± α) or R cos(θ ± α).\n3.3.5: Use this form to solve equations and find maximum and minimum values.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "4. Differentiation",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "4.1 The product rule", objective: "2.4.1: Differentiate products using the product rule.\n3.4.1: Differentiate products and quotients including those involving exponential logarithmic and trigonometric functions.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 The quotient rule", objective: "2.4.2: Differentiate quotients using the quotient rule.\n3.4.1: Differentiate products and quotients.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Derivatives of exponential functions", objective: "2.4.3: Differentiate exponential functions.\n3.4.2: Differentiate exponential and logarithmic functions including those requiring the chain rule.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Derivatives of logarithmic functions", objective: "2.4.4: Differentiate logarithmic functions.\n3.4.2: Differentiate exponential and logarithmic functions including those requiring the chain rule.", week: null, hour: 2, status: "pending" },
      { topic: "4.5 Derivatives of trigonometric functions", objective: "2.4.5: Differentiate trigonometric functions.\n3.4.3: Differentiate trigonometric functions including those involving inverse trigonometric functions.", week: null, hour: 2, status: "pending" },
      { topic: "4.6 Implicit differentiation", objective: "3.4.4: Use implicit differentiation to find derivatives of functions defined implicitly.", week: null, hour: 2, status: "pending" },
      { topic: "4.7 Parametric differentiation", objective: "3.4.5: Use parametric differentiation to find derivatives of curves defined parametrically.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Integration",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "5.1 Integration of exponential functions", objective: "2.5.1: Integrate exponential functions.\n3.5.1: Integrate exponential and logarithmic functions.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Integration of 1/(ax+b)", objective: "2.5.2: Integrate functions of the form 1/(ax + b).\n3.5.2: Integrate functions involving linear denominators.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Integration of sin(ax+b), cos(ax+b) and sec²(ax+b)", objective: "2.5.3: Integrate sin(ax + b), cos(ax + b) and sec²(ax + b).\n3.5.3: Integrate trigonometric functions including those requiring substitution.", week: null, hour: 2, status: "pending" },
      { topic: "5.4 Further integration of trigonometric function", objective: "2.5.4: Integrate further trigonometric functions using identities.\n3.5.3: Integrate trigonometric functions including those requiring substitution.", week: null, hour: 2, status: "pending" },
      { topic: "5.5 The trapezium rule", objective: "2.5.5: Use the trapezium rule to approximate definite integrals.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "6. Numerical solutions of equations",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "6.1 Finding a starting point", objective: "2.6.1: Locate roots of f(x) = 0 by considering changes of sign and use these as starting points for numerical methods.\n3.6.1: Locate roots of f(x) = 0 by considering changes of sign and use numerical methods to find roots.", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Improving your solution", objective: "2.6.2: Use iterative methods including the Newton-Raphson method to improve solutions.\n3.6.2: Use iterative methods including the Newton-Raphson method to find roots of equations.", week: null, hour: 2, status: "pending" },
      { topic: "6.3 Using iterative processes to solve problems", objective: "2.6.3: Apply numerical methods to solve problems in context.\n3.6.3: Apply numerical methods to solve problems involving other areas of mathematics.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Further algebra",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "7.1 Improper algebraic fractions", objective: "3.1.5: Express improper algebraic fractions as the sum of a polynomial and a proper fraction.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Partial fractions", objective: "3.1.6: Express a proper fraction as partial fractions with linear or quadratic denominators.", week: null, hour: 2, status: "pending" },
      { topic: "7.3 Binomial expansion of (1+x)^n for rational n", objective: "3.1.7: Use the binomial expansion of (1 + x)ⁿ for rational n including cases where n is not a positive integer and state the range of validity.", week: null, hour: 2, status: "pending" },
      { topic: "7.4 Binomial expansion of (a+x)^n for rational n", objective: "3.1.7: Use the binomial expansion of (1 + x)ⁿ for rational n.", week: null, hour: 2, status: "pending" },
      { topic: "7.5 Partial fractions and binomial expansions", objective: "3.1.6: Express a proper fraction as partial fractions.\n3.1.7: Use the binomial expansion of (1 + x)ⁿ for rational n.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Further calculus",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "8.1 Derivative of tan⁻¹(x)", objective: "3.4.6: Differentiate inverse trigonometric functions including tan⁻¹(x).", week: null, hour: 2, status: "pending" },
      { topic: "8.2 Integration of 1/(x²+a²)", objective: "3.5.4: Integrate functions of the form 1/(x² + a²) leading to inverse trigonometric functions.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Integration of kf'(x)/f(x)", objective: "3.5.5: Integrate functions of the form kf'(x)/f(x) resulting in logarithmic forms.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 Integration by substitution", objective: "3.5.6: Use substitution to integrate functions including those leading to standard forms.", week: null, hour: 2, status: "pending" },
      { topic: "8.5 The use of partial fractions in integration", objective: "3.5.7: Use partial fractions to integrate rational functions.", week: null, hour: 2, status: "pending" },
      { topic: "8.6 Integration by parts", objective: "3.5.8: Use integration by parts to integrate products of functions.", week: null, hour: 2, status: "pending" },
      { topic: "8.7 Further integration", objective: "3.5.9: Integrate functions requiring a combination of techniques including substitution partial fractions and integration by parts.", week: null, hour: 3, status: "pending" },
    ],
  },
  {
    chapter: "9. Vectors",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "9.1 Displacement or translation vectors", objective: "3.7.1: Understand and use displacement vectors and their properties.", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Position vectors", objective: "3.7.2: Use position vectors to represent points and lines in two and three dimensions.", week: null, hour: 2, status: "pending" },
      { topic: "9.3 The scalar product", objective: "3.7.3: Calculate the scalar product of two vectors and use it to find angles and perpendicularity.", week: null, hour: 2, status: "pending" },
      { topic: "9.4 The vector equation of a line", objective: "3.7.4: Find and use the vector equation of a line in two and three dimensions.", week: null, hour: 2, status: "pending" },
      { topic: "9.5 Intersection of two lines", objective: "3.7.5: Determine the intersection of two lines using vector equations including cases where lines are parallel or skew.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "10. Differential equations",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "10.1 The technique of separating variables", objective: "3.8.1: Solve first-order differential equations using separation of variables.", week: null, hour: 2, status: "pending" },
      { topic: "10.2 Forming a differential equation from a problem", objective: "3.8.2: Form differential equations from contextual problems including those involving rates of change.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "11. Complex numbers",
    year: "Year 12",
    coursebook: "Pure Mathematics 2 & 3",
    topics: [
      { topic: "11.1 Imaginary numbers", objective: "3.9.1: Understand the definition of the imaginary unit i and perform arithmetic with complex numbers.", week: null, hour: 2, status: "pending" },
      { topic: "11.2 Complex numbers", objective: "3.9.1: Understand the definition of the imaginary unit i and perform arithmetic with complex numbers.", week: null, hour: 2, status: "pending" },
      { topic: "11.3 The complex plane", objective: "3.9.2: Represent complex numbers in the complex plane and use modulus and argument.", week: null, hour: 2, status: "pending" },
      { topic: "11.4 Solving equations", objective: "3.9.3: Solve quadratic equations with real coefficients and find complex roots.", week: null, hour: 2, status: "pending" },
      { topic: "11.5 Loci", objective: "3.9.4: Describe loci in the complex plane including circles and lines using modulus and argument.", week: null, hour: 2, status: "pending" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // YEAR 12 — Mechanics
  // ══════════════════════════════════════════════════════════════
  {
    chapter: "1. Velocity and acceleration",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "1.1 Displacement and Velocity", objective: "4.2.1: Understand and use the concepts of displacement and velocity in the context of motion in a straight line.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Acceleration", objective: "4.2.2: Understand and use the concept of acceleration in the context of motion in a straight line.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Equations of constant acceleration", objective: "4.2.3: Use the equations of motion for constant acceleration.", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Displacement-Time graphs and multi-stage problems", objective: "4.2.4: Interpret and construct displacement-time graphs including multi-stage problems.", week: null, hour: 2, status: "pending" },
      { topic: "1.5 Velocity-Time graphs and multi-stage problems", objective: "4.2.5: Interpret and construct velocity-time graphs including multi-stage problems.", week: null, hour: 2, status: "pending" },
      { topic: "1.6 Graphs with discontinuities", objective: "4.2.6: Understand and analyze graphs with discontinuities in the context of motion.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Force and motion in one dimension",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "2.1 Newton's first law and relations between force and acceleration", objective: "4.4.1: Understand and apply Newton's first law of motion and the relationship between force and acceleration.", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Combinations of forces", objective: "4.4.2: Analyze and calculate the resultant of multiple forces acting in one dimension.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Weight and Motion due to gravity", objective: "4.4.3: Understand the concept of weight as a force and its role in motion due to gravity.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Normal contact force and Motion in a vertical line", objective: "4.4.4: Understand and apply the concept of normal contact force in the context of vertical motion.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Forces in two dimensions",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "3.1 Resolving forces in horizontal and vertical directions in equilibrium problems", objective: "4.1.1: Resolve forces into components and apply equilibrium conditions in two dimensions.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Resolving forces at other angles in equilibrium problems", objective: "4.1.2: Resolve forces at angles other than horizontal and vertical in equilibrium problems.", week: null, hour: 2, status: "pending" },
      { topic: "3.3 The Triangle of Forces and Lami's Theorem", objective: "4.1.3: Use the triangle of forces and Lami's theorem to solve three-force equilibrium problems.", week: null, hour: 2, status: "pending" },
      { topic: "3.4 Non-equilibrium problems for objects on slopes", objective: "4.1.4: Solve non-equilibrium problems involving objects on slopes with known directions of acceleration.", week: null, hour: 2, status: "pending" },
      { topic: "3.5 Non-equilibrium problems and finding resultant forces", objective: "4.1.5: Calculate resultant forces and determine the direction of acceleration in non-equilibrium problems.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Friction",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "4.1 Friction as part of the contact force", objective: "4.1.6: Understand friction as a component of the contact force.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 Limit of Friction", objective: "4.1.7: Understand and apply the concept of the limiting friction.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Change of direction of friction in different stages of motion", objective: "4.1.8: Analyze how the direction of friction changes in different stages of motion.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Angle of Friction", objective: "4.1.9: Understand and calculate the angle of friction.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Connected particles",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "5.1 Newton's third law", objective: "4.4.5: Understand and apply Newton's third law to connected particles.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Objects connected by rods", objective: "4.4.6: Analyze motion of objects connected by rigid rods.", week: null, hour: 2, status: "pending" },
      { topic: "5.3 Objects connected by strings", objective: "4.4.7: Analyze motion of objects connected by strings including tension forces.", week: null, hour: 2, status: "pending" },
      { topic: "5.4 Objects in moving lifts", objective: "4.4.8: Analyze the motion of objects in accelerating lifts.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "6. General motion in a straight line",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "6.1 Velocity as the derivative of displacement with respect to time", objective: "4.2.7: Understand velocity as the derivative of displacement with respect to time.", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Acceleration as the derivative of velocity with respect to time", objective: "4.2.8: Understand acceleration as the derivative of velocity with respect to time.", week: null, hour: 2, status: "pending" },
      { topic: "6.3 Displacement as the integral of velocity with respect to time", objective: "4.2.9: Understand displacement as the integral of velocity with respect to time.", week: null, hour: 2, status: "pending" },
      { topic: "6.4 Velocity as the integral of acceleration with respect to time", objective: "4.2.10: Understand velocity as the integral of acceleration with respect to time.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Momentum",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "7.1 Momentum", objective: "4.3.1: Understand and apply the concept of momentum.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Collisions and conservation of momentum", objective: "4.3.2: Apply the principle of conservation of momentum to collisions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Work and energy",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "8.1 Work done by a force", objective: "4.5.1: Understand and calculate the work done by a force.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 Kinetic Energy", objective: "4.5.2: Understand and calculate kinetic energy.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Gravitational potential energy", objective: "4.5.3: Understand and calculate gravitational potential energy.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "9. The work-energy principle and power",
    year: "Year 12",
    coursebook: "Mechanics",
    topics: [
      { topic: "9.1 Work-energy principle", objective: "4.5.4: Apply the work-energy principle to solve problems.", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Conservation of energy in a system of conservative forces", objective: "4.5.5: Apply the principle of conservation of energy for systems with conservative forces.", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Conservation of energy in a system with non-conservative forces", objective: "4.5.6: Analyze energy conservation in systems with non-conservative forces.", week: null, hour: 2, status: "pending" },
      { topic: "9.4 Power", objective: "4.5.7: Understand and calculate power in mechanical systems.", week: null, hour: 2, status: "pending" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // YEAR 12 — Further Mathematics
  // ══════════════════════════════════════════════════════════════
  {
    chapter: "1. Roots of polynomial equations",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "1.1 Quadratics", objective: "1.1.1: Solve quadratic equations including those with complex roots.", week: null, hour: 2, status: "pending" },
      { topic: "1.2 Cubics", objective: "1.1.2: Solve cubic equations using factor theorem and synthetic division.", week: null, hour: 2, status: "pending" },
      { topic: "1.3 Quartics", objective: "1.1.3: Solve quartic equations by factoring or substitution methods.", week: null, hour: 2, status: "pending" },
      { topic: "1.4 Substitutions", objective: "1.1.4: Use substitutions to simplify and solve polynomial equations.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "2. Rational functions",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "2.1 Vertical asymptotes", objective: "1.2.1: Identify and analyze vertical asymptotes of rational functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.2 Oblique asymptotes", objective: "1.2.2: Determine oblique asymptotes of rational functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.3 Inequalities", objective: "1.2.3: Solve inequalities involving rational functions.", week: null, hour: 2, status: "pending" },
      { topic: "2.4 Relationships between curves", objective: "1.2.4: Analyze relationships between curves of rational functions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "3. Summation of series",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "3.1 The summation formulae Σr, Σr², Σr³", objective: "1.3.1: Use summation formulae for sums of integers squares and cubes.", week: null, hour: 2, status: "pending" },
      { topic: "3.2 Converging series", objective: "1.3.2: Analyze and sum converging series.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "4. Matrices 1",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "4.1 Matrix operations", objective: "1.4.1: Perform matrix addition subtraction and multiplication.", week: null, hour: 2, status: "pending" },
      { topic: "4.2 The inverse matrix", objective: "1.4.2: Calculate the inverse of a matrix using determinants and adjugates.", week: null, hour: 2, status: "pending" },
      { topic: "4.3 Determinants", objective: "1.4.3: Compute determinants of matrices.", week: null, hour: 2, status: "pending" },
      { topic: "4.4 Matrix transformations", objective: "1.4.4: Apply matrices to represent geometric transformations.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "5. Polar coordinates",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "5.1 The polar system", objective: "1.5.1: Understand and use polar coordinates to represent points and curves.", week: null, hour: 2, status: "pending" },
      { topic: "5.2 Applications of polar coordinates", objective: "1.5.2: Apply polar coordinates to solve problems in geometry and physics.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "6. Vectors",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "6.1 The vector product rule", objective: "1.6.1: Compute the vector (cross) product and understand its properties.", week: null, hour: 2, status: "pending" },
      { topic: "6.2 Vector equation of a line", objective: "1.6.2: Derive and use the vector equation of a line.", week: null, hour: 2, status: "pending" },
      { topic: "6.3 Planes", objective: "1.6.3: Derive and use the equation of a plane in vector form.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "7. Proof by induction",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "7.1 The inductive process", objective: "1.7.1: Apply the principle of mathematical induction to prove statements.", week: null, hour: 2, status: "pending" },
      { topic: "7.2 Proof by Induction for Divisibility", objective: "1.7.2: Use induction to prove divisibility properties.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "8. Continuous random variables",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "8.1 The probability density function", objective: "4.1.1: Understand and use the probability density function for continuous random variables.", week: null, hour: 2, status: "pending" },
      { topic: "8.2 The cumulative distribution function", objective: "4.1.2: Use the cumulative distribution function to find probabilities.", week: null, hour: 2, status: "pending" },
      { topic: "8.3 Calculating E(g(X)) for a continuous random variable", objective: "4.1.3: Calculate the expected value of a function of a continuous random variable.", week: null, hour: 2, status: "pending" },
      { topic: "8.4 Finding the pdf and cdf of Y = g(X)", objective: "4.1.4: Determine the probability density and cumulative distribution functions of transformed random variables.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "9. Inferential statistics",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "9.1 t-distribution", objective: "4.2.1: Understand and apply the t-distribution in hypothesis testing.", week: null, hour: 2, status: "pending" },
      { topic: "9.2 Hypothesis tests concerning the difference in means", objective: "4.2.2: Conduct hypothesis tests for the difference in means using t-tests.", week: null, hour: 2, status: "pending" },
      { topic: "9.3 Paired t-tests", objective: "4.2.3: Perform paired t-tests for dependent samples.", week: null, hour: 2, status: "pending" },
      { topic: "9.4 Confidence intervals for the mean of a small sample", objective: "4.2.4: Construct confidence intervals for the mean of small samples.", week: null, hour: 2, status: "pending" },
      { topic: "9.5 Confidence intervals for the difference in means", objective: "4.2.5: Construct confidence intervals for the difference in means.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "10. Chi-squared tests",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "10.1 Forming hypotheses", objective: "4.3.1: Formulate hypotheses for chi-squared tests.", week: null, hour: 2, status: "pending" },
      { topic: "10.2 Goodness of fit for discrete distributions", objective: "4.3.2: Perform chi-squared goodness of fit tests for discrete distributions.", week: null, hour: 2, status: "pending" },
      { topic: "10.3 Goodness of fit for continuous distributions", objective: "4.3.3: Perform chi-squared goodness of fit tests for continuous distributions.", week: null, hour: 2, status: "pending" },
      { topic: "10.4 Testing association through contingency tables", objective: "4.3.4: Use chi-squared tests to analyze association in contingency tables.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "11. Non-parametric tests",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "11.1 Non-parametric tests", objective: "4.4.1: Understand the principles of non-parametric tests.", week: null, hour: 2, status: "pending" },
      { topic: "11.2 Single-sample sign test", objective: "4.4.2: Apply the single-sample sign test.", week: null, hour: 2, status: "pending" },
      { topic: "11.3 Single-sample Wilcoxon signed-rank test", objective: "4.4.3: Apply the single-sample Wilcoxon signed-rank test.", week: null, hour: 2, status: "pending" },
      { topic: "11.4 Paired-sample sign test", objective: "4.4.4: Apply the paired-sample sign test.", week: null, hour: 2, status: "pending" },
      { topic: "11.5 Wilcoxon matched-pairs signed-rank test", objective: "4.4.5: Apply the Wilcoxon matched-pairs signed-rank test.", week: null, hour: 2, status: "pending" },
      { topic: "11.6 Wilcoxon rank-sum test", objective: "4.4.6: Apply the Wilcoxon rank-sum test for independent samples.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "12. Probability generating functions",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "12.1 The probability generating function", objective: "4.5.1: Understand and use probability generating functions.", week: null, hour: 2, status: "pending" },
      { topic: "12.2 Mean and variance using the probability generating function", objective: "4.5.2: Calculate mean and variance using probability generating functions.", week: null, hour: 2, status: "pending" },
      { topic: "12.3 The sum of independent random variables", objective: "4.5.3: Use probability generating functions to find the distribution of the sum of independent random variables.", week: null, hour: 2, status: "pending" },
      { topic: "12.4 Three or more random variables", objective: "4.5.4: Extend probability generating functions to three or more random variables.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "13. Projectiles",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "13.1 Motion in the vertical plane", objective: "3.1.1: Analyze projectile motion in the vertical plane.", week: null, hour: 2, status: "pending" },
      { topic: "13.2 The Cartesian equation of the trajectory", objective: "3.1.2: Derive and use the Cartesian equation of a projectile's trajectory.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "14. Equilibrium of a rigid body",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "14.1 The moment of a force", objective: "3.2.1: Calculate the moment of a force about a point.", week: null, hour: 2, status: "pending" },
      { topic: "14.2 Centres of mass of rods and laminas", objective: "3.2.2: Determine the centre of mass for rods and laminas.", week: null, hour: 2, status: "pending" },
      { topic: "14.3 Centres of mass of solids", objective: "3.2.3: Determine the centre of mass for solid bodies.", week: null, hour: 2, status: "pending" },
      { topic: "14.4 Objects in equilibrium", objective: "3.2.4: Analyze the equilibrium of rigid bodies under multiple forces.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "15. Circular motion",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "15.1 Horizontal circles", objective: "3.3.1: Analyze motion in horizontal circles.", week: null, hour: 2, status: "pending" },
      { topic: "15.2 The 3-dimensional case", objective: "3.3.2: Analyze circular motion in three dimensions.", week: null, hour: 2, status: "pending" },
      { topic: "15.3 Vertical circles", objective: "3.3.3: Analyze motion in vertical circles.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "16. Hooke's law",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "16.1 Hooke's law", objective: "3.4.1: Understand and apply Hooke's law for elastic strings and springs.", week: null, hour: 2, status: "pending" },
      { topic: "16.2 Elastic potential energy", objective: "3.4.2: Calculate elastic potential energy in systems obeying Hooke's law.", week: null, hour: 2, status: "pending" },
      { topic: "16.3 The work-energy principle", objective: "3.4.3: Apply the work-energy principle to systems involving Hooke's law.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "17. Linear motion under a variable force",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "17.1 Acceleration with respect to time", objective: "3.5.1: Analyze linear motion with acceleration as a function of time.", week: null, hour: 2, status: "pending" },
      { topic: "17.2 Acceleration with respect to displacement", objective: "3.5.2: Analyze linear motion with acceleration as a function of displacement.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "18. Momentum",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "18.1 Impulse and the conservation of momentum", objective: "3.6.1: Apply the principles of impulse and conservation of momentum.", week: null, hour: 2, status: "pending" },
      { topic: "18.2 Oblique collisions and other examples", objective: "3.6.2: Analyze oblique collisions and other momentum-related problems.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "19. Hyperbolic functions",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "19.1 Exponential forms of hyperbolic functions", objective: "2.1.1: Understand and use exponential forms of hyperbolic functions.", week: null, hour: 2, status: "pending" },
      { topic: "19.2 Hyperbolic identities", objective: "2.1.2: Apply hyperbolic identities to solve problems.", week: null, hour: 2, status: "pending" },
      { topic: "19.3 Inverse hyperbolic functions", objective: "2.1.3: Understand and use inverse hyperbolic functions.", week: null, hour: 2, status: "pending" },
      { topic: "19.4 Logarithmic form for inverse hyperbolic functions", objective: "2.1.4: Express inverse hyperbolic functions in logarithmic form.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "20. Matrices 2",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "20.1 Eigenvalues and eigenvectors", objective: "2.2.1: Calculate eigenvalues and eigenvectors of matrices.", week: null, hour: 2, status: "pending" },
      { topic: "20.2 Matrix algebra", objective: "2.2.2: Apply advanced matrix algebra techniques.", week: null, hour: 2, status: "pending" },
      { topic: "20.3 Diagonalisation", objective: "2.2.3: Diagonalize matrices using eigenvalues and eigenvectors.", week: null, hour: 2, status: "pending" },
      { topic: "20.4 Systems of equations", objective: "2.2.4: Solve systems of linear equations using matrix methods.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "21. Differentiation",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "21.1 Implicit functions", objective: "2.3.1: Differentiate implicit functions.", week: null, hour: 2, status: "pending" },
      { topic: "21.2 Parametric equations", objective: "2.3.2: Differentiate functions defined parametrically.", week: null, hour: 2, status: "pending" },
      { topic: "21.3 Hyperbolic and inverse functions", objective: "2.3.3: Differentiate hyperbolic and inverse functions.", week: null, hour: 2, status: "pending" },
      { topic: "21.4 Maclaurin series", objective: "2.3.4: Derive Maclaurin series for functions.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "22. Integration",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "22.1 Integration techniques", objective: "2.4.1: Apply advanced integration techniques including substitution and partial fractions.", week: null, hour: 3, status: "pending" },
      { topic: "22.2 Reduction formulae", objective: "2.4.2: Derive and use reduction formulae for integration.", week: null, hour: 2, status: "pending" },
      { topic: "22.3 Arc length and surface areas", objective: "2.4.3: Calculate arc length and surface areas of revolution.", week: null, hour: 2, status: "pending" },
      { topic: "22.4 Limits of areas", objective: "2.4.4: Evaluate limits of areas using integration.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "23. Complex numbers",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "23.1 de Moivre's theorem", objective: "2.5.1: Apply de Moivre's theorem to powers and roots of complex numbers.", week: null, hour: 2, status: "pending" },
      { topic: "23.2 Powers of sine and cosine", objective: "2.5.2: Express powers of sine and cosine using complex numbers.", week: null, hour: 2, status: "pending" },
      { topic: "23.3 The roots of unity", objective: "2.5.3: Find and use the roots of unity.", week: null, hour: 2, status: "pending" },
      { topic: "23.4 Complex summations", objective: "2.5.4: Perform summations involving complex numbers.", week: null, hour: 2, status: "pending" },
    ],
  },
  {
    chapter: "24. Differential equations",
    year: "Year 12",
    coursebook: "Further Mathematics",
    topics: [
      { topic: "24.1 First order differential equations", objective: "2.6.1: Solve first-order differential equations using separation of variables and integrating factors.", week: null, hour: 2, status: "pending" },
      { topic: "24.2 Second order differential equations: The homogeneous case", objective: "2.6.2: Solve homogeneous second-order differential equations.", week: null, hour: 2, status: "pending" },
      { topic: "24.3 Second order differential equations: The inhomogeneous case", objective: "2.6.3: Solve inhomogeneous second-order differential equations.", week: null, hour: 2, status: "pending" },
      { topic: "24.4 Substitution methods for differential equations", objective: "2.6.4: Use substitution methods to solve differential equations.", week: null, hour: 2, status: "pending" },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────
async function seed() {
  const docRef = db.collection("asalevel_math_pacing").doc("year11-12");

  console.log("Seeding asalevel_math_pacing/year11-12 …");
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
