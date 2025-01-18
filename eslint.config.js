import { common, extend, ignores, modules, node, stylistic, typescript } from "@hazmi35/eslint-config";

export default [
    ...common,
    ...modules,
    ...node,
    ...ignores,
    ...stylistic,
    ...extend(typescript, [
        {
            rule: "typescript/explicit-function-return-type",
            option: ["off"]
        },
        {
            rule: "typescript/explicit-module-boundary-types",
            option: ["off"]
        }
    ])
];
