defmodule TruckingPlatform.MixProject do
  use Mix.Project

  def project do
    [
      app: :trucking_platform,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {TruckingPlatform.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7.10"},
  {:phoenix_view, "~> 2.0"},
      {:phoenix_html, "~> 3.3"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 0.20.1"},
      {:floki, ">= 0.30.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.8.2"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.20"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.1.1"},
      {:plug_cowboy, "~> 2.5"},
  # Asset builders for dev
  {:esbuild, "~> 0.8", runtime: Mix.env() == :dev},
  {:tailwind, "~> 0.2", runtime: Mix.env() == :dev},
      {:cors_plug, "~> 3.0"},
      {:httpoison, "~> 2.0"},
      {:jwt, "~> 0.1"},
      {:jose, "~> 1.11"},
      {:uuid, "~> 1.1"},
      {:poison, "~> 5.0"},
      {:hammer, "~> 6.1"},
      {:opentelemetry_api, "~> 1.2"},
      {:opentelemetry, "~> 1.3"},
      {:opentelemetry_exporter, "~> 1.6"},
      {:opentelemetry_phoenix, "~> 1.1"},
      {:opentelemetry_cowboy, "~> 0.2"},
      {:geo, "~> 3.4"},
      {:topo, "~> 1.0"},
  {:swoosh, "~> 1.11"},
      {:ex_doc, "~> 0.30", only: :dev, runtime: false}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "assets.setup", "assets.build"],
      "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      "assets.build": ["tailwind default", "esbuild default"],
      "assets.deploy": ["tailwind default --minify", "esbuild default --minify", "phx.digest"]
    ]
  end
end
