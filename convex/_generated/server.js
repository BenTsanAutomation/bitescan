/* eslint-disable */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convex_server = require("convex/server");
const schema = require("../schema");
const schemaObj = schema.default || schema;
exports.query = convex_server.queryGeneric;
exports.mutation = convex_server.mutationGeneric;
exports.action = convex_server.actionGeneric;
exports.internalQuery = convex_server.internalQueryGeneric;
exports.internalMutation = convex_server.internalMutationGeneric;
exports.internalAction = convex_server.internalActionGeneric;
exports.httpAction = convex_server.httpActionGeneric;
