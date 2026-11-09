import messages from "../../../messages/en.json";
export type OrganizationMessageKey = keyof typeof messages.Organization;
export function organizationMessageKey(key: string): OrganizationMessageKey {
  return Object.hasOwn(messages.Organization, key)
    ? (key as OrganizationMessageKey)
    : "invalid";
}
