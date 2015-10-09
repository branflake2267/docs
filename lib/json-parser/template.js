<html>
	<head>
		<title>{{{name}}}</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../styles.css">
	</head>
	<body>

	<h1 class='{{classType}}'>{{{name}}}
		{{#classAlias}}
			<span class='alias'>alias: {{{.}}}</span>
		{{/classAlias}}
	</h1>

	<div>
		<div class="classMeta">
			{{#if altNames}}
				<h3>Alternate Names</h3>
				<p>{{{altNames}}}</p>
			{{/if}}
			{{#if mixins}}
				<h3>Mixins</h3>
				<p>{{{mixins}}}</p>
			{{/if}}
			{{#if requires}}
				<h3>Requires</h3>
				<p>{{{requires}}}</p>
			{{/if}}
		</div>
		<div class="classText">{{{classText}}}</div>
	</div>
	<div class='clear'
		{{#members}}

			<h2>{{{$type}}}</h2>

			{{#items}}

				<a name={{{name}}}></a>
				<h2>{{{name}}}
					{{#type}}
						<span class='memberType'> | {{{.}}}</span>
					{{/type}}

					{{#access}}
						<span class='{{{.}}}'>{{{.}}}</span>
					{{/access}}
				</h2>

				{{#text}}
					<p>{{{.}}}</p>
				{{/text}}

				{{#value}}
					<p>Defaults to: {{{.}}}</p>
				{{/value}}

				{{#deprecatedMessage}}
					<p>Deprecated: {{{.}}}</p>
				{{/deprecatedMessage}}

			{{/items}}

		{{/members}}
	</div>
	</body>
</html>