export type PluginSettingsProps = {
  onComplete: (message?: string) => void
  args?: string
  showMcpRedirectMessage?: boolean
}

export type PluginAction = 'enable' | 'disable' | 'uninstall'
export type MarketplaceAction = 'update' | 'remove'

export type ViewState =
  | { type: 'menu' }
  | { type: 'help' }
  | { type: 'marketplace-menu' }
  | { type: 'marketplace-list' }
  | { type: 'discover-plugins'; targetPlugin?: string }
  | {
      type: 'browse-marketplace'
      targetMarketplace?: string
      targetPlugin?: string
    }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: PluginAction
    }
  | {
      type: 'manage-marketplaces'
      targetMarketplace?: string
      action?: MarketplaceAction
    }
  | { type: 'add-marketplace'; initialValue?: string }
  | { type: 'validate'; path?: string }
